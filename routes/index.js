var express = require('express');
var router = express.Router();
const sqlite3=require('sqlite3').verbose();
const http=require('http');
const path = require('path');
const geoip = require('geoip-lite');
const nodemailer = require('nodemailer');
const { request } = require('http');
const fetch = require('node-fetch');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PassportLocal = require('passport-local').Strategy;
require('../setup/passports-setup.js')

const { I18n } = require('i18n')
const i18n = new I18n({
  locales: ['es', 'en'],
  directory: path.join(__dirname, '/locales'),
  defaultLocale: 'es',
});

require('dotenv').config();

router.use(express.urlencoded({extended: true}));
router.use(cookieParser(process.env.SECRET));
router.use(session({
	secret: process.env.SECRET,
	resave: true,
	saveUninitialized: true
}))

router.use(passport.initialize());
router.use(passport.session());

passport.use( new PassportLocal(function(username, password, done){

	if(username === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD)
		return done(null,{id: 1, name: "Admin"});

	done(null, false)
}))

passport.serializeUser(function(user, done){
	done(null, user.id)
})

passport.deserializeUser(function(user, done){
	done(null,{id: 1, name: "Admin"});
})



  
const basededatos=path.join(__dirname,"basededatos","basededatos.db");
const bd=new sqlite3.Database(basededatos, err =>{ 
if (err){
	return console.error(err.message);
}else{
	console.log("...");
}
})


const create="CREATE TABLE IF NOT EXISTS contactos(email VARCHAR(20),nombre VARCHAR(20), comentario TEXT,fecha DATATIME,ip TEXT, pais VARCHAR(15));";

bd.run(create,err=>{
	if (err){
	return console.error(err.message);
}else{
	console.log("...");
}
})

router.get('/login',(req,res)=>{
	res.render('login.ejs')
});

router.post('/login', passport.authenticate('local',{
	successRedirect: "/contactos",
	failureRedirect: "/login"
}));

router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}));

router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/login'}), function(req, res){
	res.redirect('/contactos');
})

router.get('/contactos',(req, res, next)=>{
	if(req.isAuthenticated()) return next();

	res.redirect("/login")
},(req,res)=>{
	const sql="SELECT * FROM contactos;";
	bd.all(sql, [],(err, rows)=>{
			if (err){
				return console.error(err.message);
			}else{
			res.render("contactos.ejs",{tarea:rows});
			}
	})
})



const db=path.join(__dirname,"basedb","base.db");
const db_run=new sqlite3.Database(db, err =>{ 
if (err){
	return console.error(err.message);
}else{
	console.log("DB active");
}
})

const crear="CREATE TABLE IF NOT EXISTS contacts(email VARCHAR(16),nombre VARCHAR(16), comentario TEXT,fecha DATATIME,ip VARCHAR(15));";



db_run.run(crear,err=>{
	if (err){
	return console.error(err.message);
}else{
	console.log("Tb active");
}
})
router.get('/',(req,res)=>{
	res.render('index.ejs',{ct:{}})
});

db_run.run(crear,err=>{
	if (err){
	return console.error(err.message);
}else{
	console.log("Tb active");
}
})



router.get('/contactos',(req,res)=>{
	const sql="SELECT * FROM contacts;";
	db_run.all(sql, [],(err, rows)=>{
			if (err){
				return console.error(err.message);
			}else{
			res.render("contactos.ejs",{ct:rows});
			}
	})
})



//ip y la feha, junto con la importacion de los datos a la base 
router.post('/',(req,res)=>{
    const responseKey = req.body["g-recaptcha-response"];
    const secretKey = process.env.KEY_SECRET;
    const url = 
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${responseKey}`;
    fetch(url, {
      method: "post",
    })
      .then((response) => response.json())
      .then((google_response) => {
          if (google_response.success == true) {
          let today = new Date();
          let hours = today.getHours();
          let minutes = today.getMinutes();
          let seconds = today.getSeconds();
          let fecha = today.getDate() + '-' + ( today.getMonth() + 1 ) + '-' + today.getFullYear();
          let hora = hours + ':' + minutes + ':' + seconds + ' ';
          let ipdire = req.header('x-forwarded-for') || req.connection.remoteAddress;
          let ip = req.ip;
          let geo = geoip.lookup(ip);

          let geoloca = geo.country;
          let email = req.body.email;
          let nombre = req.body.nombre;
          let comentario = req.body.comentario;

          const sql="INSERT INTO contacts(nombre, email, comentario, fecha, ipdire, hora, geoloca) VALUES (?,?,?,?,?,?,?)";
          const nuevos_mensajes=[nombre,email,comentario,fecha,ip,hora,geoloca];

          db_run.run(sql, nuevos_mensajes, err =>{
            if (err){
              return console.error(err.message);
            } else{
                res.redirect("/");
            }
          })

		  const transporter = nodemailer.createTransport({
			host: 'smtp.ethereal.email',
			port: 587,
			auth: {
				user: 'jailyn.hane60@ethereal.email',
				pass: 'BV9eRS95MXb2CcV5DZ'
			}
		});
          const contenidoHTML = `
            <p>Programacion P2</p>
            <h3>Información del Cliente/Contacto:</h3>
            <ul>
              <li>Nombre: ${nombre}</li>
              <li>Email: ${email}</li>
              <li>Comentario: ${comentario}</li>
              <li>Fecha: ${fecha}</li>
            <li>Hora: ${hora}</li>
            <li>IP: ${ipdire}</li>
            <li>Pais: ${geoloca}</li>
            </ul>`;

          const send = {
            from: process.env.EMAIL,
            to: 'programacion2ais@dispostable.com',
            subject: 'Informacion del Contacto', 
            html: contenidoHTML
          };

          transporter.sendMail(send,(err, info) => {
            if(err)
              console.log(err)
            else
              console.log(info);
            })
        }else{
  
                setTimeout(function(){
              res.redirect("/");        
              }, 1800);
              }
              }).catch((error) => {
                return res.json({ error });
            });
           
});

router.get('/',(req,res) => {
  res.render('index.ejs',{modelo:{},
  KEY_RECAP:process.env.KEY_RECAP
})
});


module.exports = router;

