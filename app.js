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
app.use(koaBody())
app.use(logger())
app.use(serve("", path.join(__dirname, 'public')))

router.get('/:db/api/:table', dbcontroller.all)
router.get('/:db/count/:table/', dbcontroller.count)
router.post('/:db/add/:table/', dbcontroller.add)
router.delete('/:db/api/:table/:id', dbcontroller.remove)
router.put('/:db/api/:table/:id', dbcontroller.modify)
router.get('/:db/deletes/:table/', dbcontroller.deletes)

router.post('/sms/', alisms.alisms)
router.post('/checksms/', alisms.alichecksms)
router.post('/:db/sms/', sms.smssend)
router.get('/getsmssend/', sms.getsmssend)


app.use(router.routes())
app.listen(8000)
console.log('listen:8000')
