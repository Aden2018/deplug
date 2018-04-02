use std::collections::HashMap;
use std::fmt;
use std::mem;

#[derive(Debug, Clone)]
pub enum Value {
    Boolean(bool),
    Int64(i64),
    Uint64(u64),
    Float64(f64),
    Str(String),
    Slice(Box<[u8]>),
}

#[derive(Clone)]
pub enum Cast {
    ToBoolean(fn(&[u8]) -> Option<bool>),
    ToInt64(fn(&[u8]) -> Option<i64>),
    ToUint64(fn(&[u8]) -> Option<u64>),
    ToFloat64(fn(&[u8]) -> Option<f64>),
    ToStr(fn(&[u8]) -> Option<String>),
    ToSlice(fn(&[u8]) -> Option<&[u8]>),
}

impl fmt::Debug for Cast {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Cast")
    }
}

#[derive(Debug, Clone)]
pub struct Prop {
    id: String,
    typ: String,
    cast: Cast,
}

impl Prop {
    pub fn new(id: &str, typ: &str, cast: Cast) -> Prop {
        Prop {
            id: String::from(id),
            typ: String::from(typ),
            cast: cast,
        }
    }
}

#[derive(Debug, Clone)]
pub struct BoundProp {
    attr: Prop,
    data: Box<[u8]>,
}

impl BoundProp {
    pub fn value(&self) -> Option<Value> {
        match self.attr.cast.clone() {
            Cast::ToBoolean(func) => func(&self.data).map(|v| Value::Boolean(v)),
            Cast::ToInt64(func) => func(&self.data).map(|v| Value::Int64(v)),
            Cast::ToUint64(func) => func(&self.data).map(|v| Value::Uint64(v)),
            Cast::ToFloat64(func) => func(&self.data).map(|v| Value::Float64(v)),
            Cast::ToStr(func) => func(&self.data).map(|v| Value::Str(v)),
            Cast::ToSlice(func) => {
                func(&self.data).map(|v| Value::Slice(unsafe { Box::from_raw(mem::transmute(v)) }))
            }
        }
    }
}

#[derive(Debug, Clone)]
pub struct Registry {
    map: HashMap<String, Prop>,
}

impl Registry {
    pub fn new() -> Registry {
        Registry {
            map: HashMap::new(),
        }
    }

    pub fn register(&mut self, id: &str, typ: &str, cast: Cast) -> Prop {
        self.map
            .entry(String::from(id))
            .or_insert_with(|| Prop::new(id, typ, cast))
            .clone()
    }

    fn get(&mut self, id: &str) -> Option<Prop> {
        self.map.get(&String::from(id)).map(|attr| attr.clone())
    }
}
