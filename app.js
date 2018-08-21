import Koa from "koa"
import serve from "koa-static2"
import logger from "koa-logger"
import Router from "koa-router"
import cors from 'koa2-cors'
import koaBody from 'koa-body'
import path from "path"
import dbcontroller from "./db/db"
import alisms from './sms/alisms'
import sms from './sms/sms'

const app = new Koa()
const router = new Router()

app.use(cors())
app.use(async (ctx, next) => {
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.set('Access-Control-Allow-Methods', 'PUT,DELETE,POST,GET');
    ctx.set('Access-Control-Max-Age', 3600 * 24);
    await next();
   });
app.use(koaBody())
app.use(logger())
app.use(serve("", path.join(__dirname, 'public')))

router.get('/:db/api/:table', dbcontroller.all)
router.get('/:db/count/:table/', dbcontroller.count)
router.post('/:db/add/:table/', dbcontroller.add)

router.post('/sms/', alisms.alisms)
router.post('/checksms/', alisms.alichecksms)
router.post('/:db/sms/', sms.smssend)
router.get('/getsmssend/', sms.getsmssend)


app.use(router.routes())
app.listen(8000)
console.log('listen:8000')
