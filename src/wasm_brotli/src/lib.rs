// https://developer.mozilla.org/en-US/docs/WebAssembly/Rust_to_wasm
// https://github.com/rustwasm/wasm-pack
// https://github.com/dropbox/rust-brotli
// https://github.com/phiresky/rust-brotli-wasm
use wasm_bindgen::prelude::*;

use std::io::Write;

#[wasm_bindgen]
pub fn compress(input: &[u8]) -> Vec<u8> {
  let buffer_size: usize = 4096;
  let quality: u32 = 11;
  let lg_window_size: u32 = 21;
  let mut output = Vec::new();
  {
    let mut writer = brotli::CompressorWriter::new(&mut output, buffer_size, quality, lg_window_size);
    writer.write(input).unwrap();
  }
  return output;
}

#[wasm_bindgen]
pub fn decompress(input: &[u8]) -> Vec<u8> {
  let buffer_size: usize = 4096;
  let mut output = Vec::new();
  {
    let mut writer = brotli::DecompressorWriter::new(&mut output, buffer_size);
    writer.write(&input).unwrap();
  }
  return output;
}
