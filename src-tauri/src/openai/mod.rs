//! meetscribe: OpenAI speech engine.
//!
//! Optional cloud route next to the local transcribe-cpp models, for machines without a fast GPU:
//! - dictation and meeting text: `gpt-transcribe` (file transcription, language list + keywords);
//! - meeting speakers: `gpt-4o-transcribe-diarize` per utterance, kept consistent across the
//!   meeting with up to four enrolled voice references ([`speakers`]);
//! - meeting notes after a meeting: the Responses API ([`notes`]).
//!
//! Audio only leaves the machine when the user turns one of these on in the Meetings settings.
//! The API key is read from `OPENAI_API_KEY`, the OS keyring (`service=openai account=api-key`)
//! or the post-processing "OpenAI" key, in that order, and is never written anywhere.

pub mod client;
pub mod notes;
pub mod settings;
pub mod speakers;

pub use client::Client;
pub use settings::OpenAiSettings;

/// Runs `f` on a plain OS thread. The blocking HTTP client must not run (or be dropped) on a
/// tokio worker, and some callers (the dictation stop path) are async tasks.
pub fn off_runtime<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> T {
    std::thread::spawn(f)
        .join()
        .unwrap_or_else(|e| std::panic::resume_unwind(e))
}

/// Value of the meeting "ASR model" setting that selects OpenAI.
pub const MEETING_MODEL_ID: &str = "openai";

/// True when meetings run on OpenAI: chosen explicitly as the meeting model, or the meeting
/// follows the dictation model and that is OpenAI.
pub fn meetings_enabled(app: &tauri::AppHandle) -> bool {
    match crate::meeting::settings::load(app).asr_model.as_deref() {
        Some(MEETING_MODEL_ID) => true,
        Some(_) => false,
        None => settings::load(app).dictation,
    }
}

/// True when dictation should go to OpenAI instead of the local model.
pub fn dictation_enabled(app: &tauri::AppHandle) -> bool {
    settings::load(app).dictation
}

/// Dictation through OpenAI: one `gpt-transcribe` request for the whole clip.
pub fn transcribe_dictation(app: &tauri::AppHandle, samples: Vec<f32>) -> anyhow::Result<String> {
    if samples.is_empty() {
        return Ok(String::new());
    }
    let s = settings::load(app);
    let app_settings = crate::settings::get_settings(app);
    let languages = match app_settings.selected_language.as_str() {
        "auto" | "" => s.languages.clone(),
        code => vec![code
            .split(['-', '_'])
            .next()
            .unwrap_or(code)
            .to_ascii_lowercase()],
    };
    let keywords = app_settings.custom_words.clone();
    let client = Client::from_app(app)?;
    let started = std::time::Instant::now();
    let model = s.transcribe_model.clone();
    let secs = samples.len() as f64 / 16_000.0;
    let text = off_runtime(move || client.transcribe(&model, &samples, &languages, &keywords))?;
    log::info!(
        "OpenAI dictation: {:.1}s of audio in {:.2}s",
        secs,
        started.elapsed().as_secs_f64()
    );
    Ok(text.trim().to_string())
}
