extern crate libc;
extern crate byteorder;

#[macro_use]
extern crate plugkit;

use std::io::{Cursor,Error,ErrorKind};
use byteorder::{BigEndian};
use plugkit::token;
use plugkit::token::Token;
use plugkit::reader::ByteReader;
use plugkit::layer::{Layer,Confidence};
use plugkit::context::Context;
use plugkit::worker::Worker;
use plugkit::variant::Value;
use plugkit::attr::ResultValue;

pub mod file;

fn eth_type(val: u32) -> Option<(Token, Token)> {
    match val {
        0x0800 => Some((token::get("[ipv4]"), token::get("eth.type.ipv4"))),
        0x86DD => Some((token::get("[ipv6]"), token::get("eth.type.ipv6"))),
        _ => None
    }
}

struct ETHWorker {}

impl Worker for ETHWorker {
    fn analyze(&self, ctx: &mut Context, layer: &mut Layer) -> Result<(), Error> {
        let (slice, range) = {
            let payload = layer.payloads().next().ok_or(Error::new(ErrorKind::Other, "no payload"))?;
            let slice = payload.slices().next().ok_or(Error::new(ErrorKind::Other, "no slice"))?;
            (slice, payload.range())
        };

        let mut rdr = Cursor::new(slice);

        let child = layer.add_layer(ctx, token!("eth"));
        child.set_confidence(Confidence::Error);
        child.add_tag(token!("eth"));
        child.set_range(range);
        {
            let attr = child.add_attr(ctx, token!("eth.src"));
            attr.set_typ(token!("@eth:mac"));
            attr.set_result(ByteReader::read_slice(&mut rdr, 6))?;
        }
        {
            let attr = child.add_attr(ctx, token!("eth.dst"));
            attr.set_typ(token!("@eth:mac"));
            attr.set_result(ByteReader::read_slice(&mut rdr, 6))?;
        }

        let (typ, range) = ByteReader::read_u16::<BigEndian>(&mut rdr)?;
        if typ <= 1500 {
            let attr = child.add_attr(ctx, token!("eth.len"));
            attr.set(&(typ as u32));
            attr.set_range(&(12..14));
        } else {
            {
                let attr = child.add_attr(ctx, token!("eth.type"));
                attr.set(&(typ as u32));
                attr.set_typ(token!("@enum"));
                attr.set_range(&range);
            }
            if let Some(item) = eth_type(typ) {
                let (tag, id) = item;
                child.add_tag(tag);
                let attr = child.add_attr(ctx, id);
                attr.set(&true);
                attr.set_typ(token!("@novalue"));
                attr.set_range(&range);
            }
        }
        {
            let (data, range) = ByteReader::read_slice_to_end(&mut rdr)?;
            let payload = child.add_payload(ctx);
            payload.add_slice(data);
            payload.set_range(&range);
        }

        child.set_confidence(Confidence::Exact);
        Ok(())
    }
}

plugkit_module! ({});
plugkit_api_layer_hints! (token::get("[eth]"));
plugkit_api_worker! (ETHWorker, ETHWorker{});
