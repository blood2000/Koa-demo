import Koa from "koa"
import serve from "koa-static2"
import logger from "koa-logger"
import Router from "koa-router"
import cors from 'koa2-cors'
import koaBody from 'koa-body'
import path from "path"
import dbcontroller from "./db/db"
import alisms from './sms/alisms'


const app = new Koa()
const router = new Router()

app.use(cors())
app.use(koaBody())
app.use(logger())
app.use(serve("", path.join(__dirname, 'public')))

router.get('/:db/api/:table', dbcontroller.all)
router.get('/:db/count/:table/', dbcontroller.count)
router.get('/:db/add/:table/', dbcontroller.add)

//短信
router.post('/sms/', alisms.alisms)


app.use(router.routes())
app.listen(8000)
console.log('listen:8000')
