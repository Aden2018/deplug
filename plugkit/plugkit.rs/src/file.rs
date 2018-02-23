//! File I/O traits.

extern crate libc;

use std::mem;
use std::slice;
use std::io::{Error, ErrorKind, Result};
use std::path::Path;
use std::fs::File;
use super::layer::Layer;
use super::variant::Variant;
use super::context::Context;

pub enum Status {
    Done        = 0,
    Error       = 1,
    Unsupported = 2
}

#[repr(C)]
pub struct RawFrame {
    link: u32,
    payload: *const libc::c_char,
    len: libc::size_t,
    actlen: libc::size_t,
    ts_sec: i64,
    ts_nsec: i64,
    root: *const Layer,
    data: Variant
}

impl RawFrame {
    pub fn link(&self) -> u32 {
        self.link
    }

    pub fn set_link(&mut self, val: u32) {
        self.link = val;
    }

    pub fn payload(&self) -> &[u8] {
        unsafe { slice::from_raw_parts(self.payload as *const u8, self.len as usize) }
    }

    pub fn set_payload_and_forget(&mut self, data: Box<[u8]>) {
        self.payload = data.as_ptr() as *const i8;
        self.len = data.len() as usize;
        mem::forget(data);
    }

    pub fn data(&self) -> &Variant {
        &self.data
    }

    pub fn data_mut(&mut self) -> &mut Variant {
        &mut self.data
    }

    pub fn actlen(&self) -> usize {
        self.actlen
    }

    pub fn set_actlen(&mut self, val: usize) {
        self.actlen = val;
    }

    pub fn ts(&self) -> (i64, i64) {
        (self.ts_sec, self.ts_nsec)
    }

    pub fn set_ts(&mut self, val: (i64, i64)) {
        self.ts_sec = val.0;
        self.ts_nsec = val.1;
    }

    pub fn root(&self) -> Option<&Layer> {
        if self.root.is_null() {
            None
        } else {
            unsafe { Some(&*self.root) }
        }
    }
}

pub trait Importer {
    fn start(_ctx: &mut Context, _path: &Path, _file: &mut File, _dst: &mut [RawFrame], _cb: &Fn(&mut Context, usize, f64)) -> Result<()> {
        Err(Error::new(ErrorKind::InvalidInput, "unsupported"))
    }
}

pub trait Exporter {
    fn start(_ctx: &mut Context, _path: &Path, _file: &mut File, _cb: &Fn(&mut Context) -> &[RawFrame]) -> Result<()> {
        Err(Error::new(ErrorKind::InvalidInput, "unsupported"))
    }
}
