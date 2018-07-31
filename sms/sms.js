import { MongoClient } from 'mongodb'
import path from 'path'
import dbunit from '../db/dbunit'
import moment from 'moment'
import axios from 'axios'

class sms {

    async smssend(ctx) {
        let mobile = []
        for (let item of model.tel) {
            mobile.push(item.tel)
        }
        //org_id: 59c0baa9b6ffda325a8737ae
        // var orgdb = await MongoClient.connect(dbunit.getdbstr('luban8'))
        // let org = await orgdb.collection('org').findOneAndUpdate({
        //     'db': db
        // }, {
        //         $inc: { 'sms': -(model.tel.length), 'smssend': model.tel.length }
        //     })
        // console.log('~~~~db~~~~~~', db)
        //   let datetime = moment(model.fixed_time).format("YYYY-MM-DD HH:mm:ss")
        //   console.log('~~~~~time~~~~~~~~~',datetime)
        //   console.log(datetime)
        //网址：http://dx.106msg.com/login.htm
        //账号：bullstech
        //密码：gaoqihao@bullstech.cn
        //接口网关：8b6bf7b
        let smsdata = {
            type: 'send',
            username: 'bullstech',
            password: 'FC6E673470BA5628D26430089C52D18C',
            gwid: '8b6bf7b',
            mobile: mobile.join(),
            dstime:datetime,
            rece: 'json',
            message: '【' + model.title + '】' + model.content + '(退订回T)'
        }
        console.log('~~~~~~~~smsdata~~~~~~~~~~~' + smsdata)

        // let body = querystring.stringify(smsdata)
        // let options = {
        //     hostname: 'jk.106api.cn',
        //     port: 80,
        //     path: '/smsUTF8.aspx',
        //     method: 'POST',
        //     agent: false,
        //     rejectUnauthorized: false,
        //     headers: {
        //         "content-type": "application/x-www-form-urlencoded",
        //         'Content-Length': body.length,
        //     }
        // }
        let model = ctx.request.body
        let smssendinfo = {}
        smssendinfo = await axios
                      .post('https://jk.106api.cn/application/x-www-form-urlencoded',body)
        var dbclient = await MongoClient.connect(dbunit.getDBStr(db))
        model.smssendinfo = smssendinfo
        model.status = smssendinfo.code
        dbunit.changeModelId(model)
        let smssends = await dbclient.collection('smssend').insert(model)
        ctx.body = await smssendinfo
    }

    async getsmssend(ctx) {
        if ('GET' != this.method) return await next
        let access_smssend = {}
        access_smssend = await axios
                        .post('https://jk.106api.cn/statusApi.aspx?type=query&username=18960828505&password=A750A4CDD88D39140D81D71615824272&rece=json', body)
        ctx.body = await access_smssend
    }
      
  }
  export default new sms()