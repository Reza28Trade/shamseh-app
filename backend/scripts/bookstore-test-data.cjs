#!/usr/bin/env node
'use strict';
require('dotenv/config');
const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const argon2 = require('argon2');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));
const argValue = (prefix) => process.argv.find((v) => v.startsWith(prefix))?.slice(prefix.length);
const storageRoot = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
const receiptPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p7sAAAAASUVORK5CYII=', 'base64');
const names = ['آرمان رضایی','نگار محمدی','پارسا کریمی','رها احمدی','آوا حسینی','سامان مرادی','هلیا کاظمی','بردیا جعفری','یسنا نوری','کیان موسوی','ترانه صادقی','مانی رستگار'];
const cities = ['تهران، خیابان ولیعصر، کوچه بهار','کرج، عظیمیه، بلوار شریعتی','اصفهان، خیابان چهارباغ، کوچه هنر','شیراز، معالی‌آباد، خیابان پزشکان','تبریز، ولیعصر، خیابان بهارستان','رشت، گلسار، خیابان ۱۰۸'];
function usage() {
 console.log('Bookstore QA utility (standalone; not part of admin panel)\n\nPlan only: node scripts/bookstore-test-data.cjs\nSeed: BOOKSTORE_TEST_ALLOW_WRITES=YES node scripts/bookstore-test-data.cjs --seed --confirm\nCleanup: BOOKSTORE_TEST_ALLOW_WRITES=YES node scripts/bookstore-test-data.cjs --cleanup --marker=BOOKSTORE-QA-... --confirm\n\nCreates 10 books, 12 student accounts and 44 orders. Test password: 09120000000.');
}
function requireWriteApproval() {
 if (!args.has('--confirm') || process.env.BOOKSTORE_TEST_ALLOW_WRITES !== 'YES') throw new Error('Write blocked. Supply --confirm and set BOOKSTORE_TEST_ALLOW_WRITES=YES explicitly.');
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');
}
const amount = (n) => Number(n.toFixed(2));
async function plan() {
 const [books,students,orders] = await Promise.all([prisma.book.count(),prisma.student.count(),prisma.bookOrder.count()]);
 const db = new URL(process.env.DATABASE_URL);
 console.log('PLAN ONLY — no database changes.');
 console.log('Database target: '+db.host+'/'+db.pathname.slice(1));
 console.log('Current records: '+books+' books | '+students+' students | '+orders+' orders');
 console.log('Confirmed seed adds 10 books, 12 students and 44 orders.');
}
async function seed() {
 requireWriteApproval();
 const marker = 'BOOKSTORE-QA-'+new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
 const passwordHash = await argon2.hash('09120000000');
 const files = [];
 const specs = [['RESERVED',4],['AWAITING_RECEIPT',4],['PAYMENT_REVIEW',6],['PAYMENT_REJECTED',4],['PAID',5],['PROCESSING',5],['SHIPPED',4],['DELIVERED',4],['REFUND_PENDING',3],['REFUNDED',3],['CANCELLED',2]];
 try {
  const result = await prisma.$transaction(async tx => {
   const books=[];
   for(let i=1;i<=10;i++) books.push(await tx.book.create({data:{
    title:marker+' | کتاب آزمایشی '+String(i).padStart(2,'0'),
    description:'داده آزمایشی کتاب‌فروشی؛ '+marker,category:'آزمون عملیاتی فروشگاه',
    academicLevel:i%2?'MASTER':'DOCTORATE',price:180000+i*12500,
    discountedPrice:i%3===0?165000+i*10000:null,stockQuantity:500,reservedQuantity:0,
    isActive:true,displayOrder:9000+i
   }}));
   const students=[];
   for(let i=1;i<=12;i++){
    const suffix=String(i).padStart(3,'0'), username=marker+'-'+suffix;
    const user=await tx.user.create({data:{username,passwordHash,role:UserRole.STUDENT,status:UserStatus.ACTIVE}});
    const student=await tx.student.create({data:{
     userId:user.id,fullName:marker+' | '+names[i-1],nationalId:username,
     phone:'0912'+String(1000000+i).slice(-7),academicLevel:i%2?'MASTER':'DOCTORATE'
    }});
    students.push({user,student});
   }
   const orders=[]; let cursor=0;
   for(const [status,count] of specs) for(let n=0;n<count;n++){
    const index=cursor++,owner=students[index%students.length];
    const items=[{book:books[index%books.length],quantity:1+(index%2)},{book:books[(index+3)%books.length],quantity:1}];
    const subtotal=items.reduce((sum,x)=>sum+Number(x.book.discountedPrice??x.book.price)*x.quantity,0);
    const reserved=['RESERVED','AWAITING_RECEIPT','PAYMENT_REVIEW','PAYMENT_REJECTED'].includes(status);
    const sold=['PAID','PROCESSING','SHIPPED','DELIVERED','REFUND_PENDING','REFUNDED'].includes(status);
    const receiptNeeded=['PAYMENT_REVIEW','PAYMENT_REJECTED','PAID','PROCESSING','SHIPPED','DELIVERED','REFUND_PENDING','REFUNDED'].includes(status);
    let receiptStorageKey=null;
    if(receiptNeeded){
     receiptStorageKey=crypto.randomUUID()+'.png'; fs.mkdirSync(storageRoot,{recursive:true});
     const full=path.join(storageRoot,receiptStorageKey); fs.writeFileSync(full,receiptPng,{flag:'wx',mode:0o600}); files.push(full);
    }
    const now=new Date();
    const order=await tx.bookOrder.create({data:{
     studentId:owner.student.id,status,
     refundStatus:status==='REFUND_PENDING'?'REQUESTED':status==='REFUNDED'?'COMPLETED':'NONE',
     refundFromStatus:['REFUND_PENDING','REFUNDED'].includes(status)?'PROCESSING':null,
     recipientName:marker+' | '+names[index%names.length],recipientPhone:owner.student.phone,
     postalCode:'1'+String(100000000+index).slice(-9),
     shippingAddress:cities[index%cities.length]+'، پلاک '+(index+1)+' — '+marker,
     subtotal:amount(subtotal),receiptStorageKey,receiptMimeType:receiptNeeded?'image/png':null,
     receiptFileSize:receiptNeeded?BigInt(receiptPng.length):null,receiptUploadedAt:receiptNeeded?now:null,
     paymentReference:receiptNeeded?marker+'-'+String(index+1).padStart(3,'0'):null,
     paymentSubmittedAt:receiptNeeded?now:null,
     receiptRejectionReason:status==='PAYMENT_REJECTED'?'رسید آزمایشی برای بررسی حالت رد':null,
     reviewedAt:['PAYMENT_REJECTED','PAID','PROCESSING','SHIPPED','DELIVERED','REFUND_PENDING','REFUNDED'].includes(status)?now:null,
     shippedAt:['SHIPPED','DELIVERED'].includes(status)?now:null,
     trackingCode:['SHIPPED','DELIVERED'].includes(status)?marker+'-TRK-'+(index+1):null,
     deliveredAt:status==='DELIVERED'?now:null,
     refundRequestedAt:['REFUND_PENDING','REFUNDED'].includes(status)?now:null,
     refundCompletedAt:status==='REFUNDED'?now:null,
     refundNote:['REFUND_PENDING','REFUNDED'].includes(status)?'بازپرداخت آزمایشی '+marker:null,
     cancelledAt:status==='CANCELLED'?now:null,
     reservationExpiresAt:reserved?new Date(Date.now()+48*60*60*1000):null,
     items:{create:items.map(x=>({bookId:x.book.id,quantity:x.quantity,unitPrice:Number(x.book.discountedPrice??x.book.price)}))}
    }});
    orders.push(order);
    for(const item of items){
     if(reserved) await tx.book.update({where:{id:item.book.id},data:{reservedQuantity:{increment:item.quantity}}});
     if(sold) await tx.book.update({where:{id:item.book.id},data:{stockQuantity:{decrement:item.quantity}}});
     if(status==='REFUNDED') await tx.book.update({where:{id:item.book.id},data:{stockQuantity:{increment:item.quantity}}});
    }
   }
   return {books,students,orders};
  },{isolationLevel:'Serializable',timeout:60000});
  console.log('\nSEED COMPLETE — marker: '+marker);
  console.log('Books: '+result.books.length+' | Students: '+result.students.length+' | Orders: '+result.orders.length);
  console.log('Statuses: '+specs.map(x=>x[0]+'='+x[1]).join(' | '));
  console.log('Student login accounts (username = national ID; password for all: 09120000000):');
  for(const x of result.students) console.log(x.student.nationalId+' | '+x.student.fullName);
  console.log('\nSave this exact marker for cleanup. No existing records were modified.');
 } catch(error) {
  for(const file of files) try{fs.unlinkSync(file)}catch{}
  throw error;
 }
}
async function cleanup() {
 requireWriteApproval();
 const marker=argValue('--marker=');
 if(!marker||!/^BOOKSTORE-QA-[A-Z0-9-]{10,80}$/.test(marker)) throw new Error('Provide the exact --marker=BOOKSTORE-QA-... . Nothing deleted.');
 const [users,books]=await Promise.all([
  prisma.user.findMany({where:{username:{startsWith:marker+'-'}},select:{id:true,username:true,student:{select:{id:true,bookOrders:{select:{id:true,receiptStorageKey:true}}}}}}),
  prisma.book.findMany({where:{title:{startsWith:marker+' |'}},select:{id:true,title:true,orderItems:{select:{orderId:true}}}})
 ]);
 const studentIds=users.map(x=>x.student?.id).filter(Boolean), orderMap=new Map();
 for(const u of users) for(const o of u.student?.bookOrders||[]) orderMap.set(o.id,o);
 for(const b of books) for(const item of b.orderItems) if(!orderMap.has(item.orderId)) throw new Error('Safety stop: marked book is linked to an order outside this marked test set.');
 if(!users.length&&!books.length){console.log('No records found for '+marker+'.');return;}
 console.log('Cleanup preview — '+marker);
 console.log('Users: '+users.length+' | Students: '+studentIds.length+' | Books: '+books.length+' | Orders: '+orderMap.size);
 console.log('Removing only records owned by this exact marker.');
 const receiptKeys=[...orderMap.values()].map(x=>x.receiptStorageKey).filter(Boolean);
 await prisma.$transaction(async tx=>{
  if(studentIds.length) await tx.student.deleteMany({where:{id:{in:studentIds}}});
  if(users.length) await tx.user.deleteMany({where:{id:{in:users.map(x=>x.id)}}});
  if(books.length){
   const remaining=await tx.bookOrderItem.count({where:{bookId:{in:books.map(x=>x.id)}}});
   if(remaining) throw new Error('Safety stop: test books still have order references.');
   await tx.book.deleteMany({where:{id:{in:books.map(x=>x.id)}}});
  }
 },{isolationLevel:'Serializable',timeout:60000});
 for(const key of receiptKeys){
  if(!/^[0-9a-f-]{36}\.png$/i.test(key)) continue;
  const full=path.resolve(storageRoot,key);
  if(path.dirname(full)!==path.resolve(storageRoot)) continue;
  try{fs.unlinkSync(full)}catch(e){if(e.code!=='ENOENT') console.error('Could not remove receipt '+key+': '+e.message);}
 }
 console.log('CLEANUP COMPLETE — users '+users.length+', students '+studentIds.length+', books '+books.length+', orders '+orderMap.size+', sample receipts '+receiptKeys.length+'.');
}
async function main(){
 if(args.has('--help')) return usage();
 if(args.has('--seed')&&args.has('--cleanup')) throw new Error('Choose only --seed or --cleanup.');
 if(args.has('--seed')) return seed();
 if(args.has('--cleanup')) return cleanup();
 return plan();
}
main().catch(e=>{console.error('\nFAILED:',e.message||e);process.exitCode=1;}).finally(async()=>{await prisma.$disconnect();});
