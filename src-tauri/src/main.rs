// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tauri_plugin_shell::ShellExt;

fn kill_sidecar(child_arc: &Arc<Mutex<Option<tauri_plugin_shell::process::CommandChild>>>) {
    let mut guard = child_arc.lock().unwrap();
    if let Some(child) = guard.take() {
        eprintln!("[PulseJam] Terminating MRT2 sidecar...");
        if let Err(e) = child.kill() {
            eprintln!("[PulseJam] Sidecar kill error: {}", e);
        } else {
            eprintln!("[PulseJam] MRT2 sidecar terminated.");
        }
    }
}

fn main() {
    // Shared handle: setup hook stores the child; all exit handlers share it.
    let sidecar_child: Arc<Mutex<Option<tauri_plugin_shell::process::CommandChild>>> =
        Arc::new(Mutex::new(None));

    let sidecar_for_exit = Arc::clone(&sidecar_child);
    let sidecar_for_signal = Arc::clone(&sidecar_child);

    // Install SIGTERM + SIGINT handler. This fires when the OS kills the process
    // (e.g. `kill <pid>`, Launchd stopping the app, or Ctrl+C in terminal).
    // Without this, Tauri's RunEvent::Exit does NOT fire on SIGTERM — the process
    // just exits and the child sidecar is orphaned.
    ctrlc::set_handler(move || {
        eprintln!("[PulseJam] Signal received — terminating MRT2 sidecar before exit...");
        kill_sidecar(&sidecar_for_signal);
        std::process::exit(0);
    })
    .expect("Failed to install signal handler");

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            // Spawn the MRT2 sidecar wrapper. Tauri resolves the platform
            // suffix automatically (binaries/sidecar-aarch64-apple-darwin).
            match app.shell().sidecar("sidecar") {
                Ok(cmd) => {
                    match cmd.spawn() {
                        Ok((mut rx, child)) => {
                            eprintln!("[PulseJam] MRT2 sidecar spawned (PID managed by Tauri)");
                            *sidecar_child.lock().unwrap() = Some(child);

                            // Stream sidecar stdout/stderr to Tauri stderr
                            tauri::async_runtime::spawn(async move {
                                use tauri_plugin_shell::process::CommandEvent;
                                while let Some(event) = rx.recv().await {
                                    match event {
                                        CommandEvent::Stdout(line) => {
                                            eprintln!(
                                                "[sidecar stdout] {}",
                                                String::from_utf8_lossy(&line)
                                            );
                                        }
                                        CommandEvent::Stderr(line) => {
                                            eprintln!(
                                                "[sidecar stderr] {}",
                                                String::from_utf8_lossy(&line)
                                            );
                                        }
                                        CommandEvent::Terminated(status) => {
                                            eprintln!(
                                                "[PulseJam] Sidecar process ended: {:?}",
                                                status
                                            );
                                            break;
                                        }
                                        _ => {}
                                    }
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!("[PulseJam] WARNING: Failed to spawn MRT2 sidecar: {}", e);
                            eprintln!(
                                "[PulseJam] Ensure experiments/mrt2-sanity-check/venv is set up."
                            );
                            // App continues without sidecar — ConditioningBridge handles
                            // 'unavailable' state gracefully.
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[PulseJam] WARNING: Could not resolve sidecar binary: {}", e);
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building pulsejam desktop application");

    // Run the event loop manually so we can intercept RunEvent::Exit.
    // This fires on ALL exit paths: window close, Cmd+Q, SIGTERM, and
    // programmatic app.exit() — ensuring the sidecar is always killed.
    app.run(move |_app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            eprintln!("[PulseJam] App exiting — cleaning up MRT2 sidecar...");
            kill_sidecar(&sidecar_for_exit);
        }
    });
}
