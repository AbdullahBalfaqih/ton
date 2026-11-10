'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const zlib=require('node:zlib');
const {makeWidget}=require('../src/widget');

test('widget is self-contained and within Telegram byte limits',()=>{
 const html=makeWidget({id:'x',kind:'campaign',title:'A goal',description:'Shared goal',goal:250,raised:12,participants:[{name:'Mariam'}],inviteUrl:'https://t.me/Qatta_Bot?start=join_abcd',revision:2,paymentEnabled:true});
 assert.ok(Buffer.byteLength(html,'utf8')<=32768);
 assert.ok(zlib.deflateSync(Buffer.from(html),{level:9}).length<=4096);
 assert.doesNotMatch(html,/<script\s+src|<link\b|fetch\s*\(|XMLHttpRequest|WebSocket/i);
 assert.doesNotMatch(html,/<input\b/i);
 assert.match(html,/publicDataChanged/);
 assert.match(html,/W\.request/);
 assert.match(html,/10000/);
 assert.match(html,/5,10,25/);
});

test('campaign text is bot state, not executable HTML',()=>{
 const html=makeWidget({title:'<img src=x onerror=alert(1)>'});
 assert.ok(!html.includes('<img src=x'));
 assert.match(html,/W\.publicData/);
});
