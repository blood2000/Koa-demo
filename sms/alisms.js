import { MongoClient } from 'mongodb'
import SMSClient from './smsclient'
import dbunit from '../db/dbunit'

const accessKeyId = 'LTAIk1hNMcPITKIH'
const secretAccessKey = 'rJVo5WIvmwYz1dz1KIRMqAfLyOtdFU'
const queueName = 'Alicom-Queue-1420938370661882-'
const smsdb = 'landlord '

class alisms {

    async alisms(ctx) {
        console.log('34867')
        let model = ctx.request.body
        console.log('model',model)
        let smsClient = new SMSClient({ accessKeyId, secretAccessKey })
        function addNumber(count) {
            let str = '';
            for (var i = 0; i < count; i += 1) {
                str += Math.floor(Math.random() * 10);
            }
            return str;
        }
        let number = addNumber(6)
        console.log(number)
        
        var db = await MongoClient.connect(dbunit.getDBStr(smsdb))
        let nowtime = new Date().getTime()
        console.log('model.phone is',model.phone)
        let smssend = await db.collection('smssend').insert(
            {
                'phone': model.phone,
                'number': number,
                'smstime': nowtime
            })
        let sms = await db.collection('sms').findOneAndUpdate(
            {
                phone: model.phone
            },
            {
                'phone': model.phone,
                'number': number,
                'smstime': nowtime,
                'smscheck': false
            },
            {
                upsert: true
            })
    
        let res = await smsClient.sendSMS({
            PhoneNumbers: model.phone,
            SignName: '林祖鑫',
            TemplateCode: 'SMS_138890013',
            TemplateParam: JSON.stringify({ 'code': number })
        })
        let { Code } = res
        let smsinfo = {}
        smsinfo.info = 'Send OK'
        if (Code === 'OK') {
            //处理返回参数
            console.log(res)
            //smsinfo.res = res
        } else {
            smsinfo.info = 'Send Error'
        }
        ctx.body = await smsinfo
    }
    
     async alichecksms(ctx) {
        var db = await MongoClient.connect(dbunit.getDBStr(smsdb))
        let table = db.collection('sms')
        let options = []
        let sms = ctx.request.body
        console.log('--sms--',sms)
        options.push({
            '$match': {
                'phone': sms.phone,
                'number': sms.num
            }
        })
        console.log('---options--',options)
        let cursor = table.aggregate(options)
        console.log('---cursor--',cursor)
        let model = await cursor.toArray()
        let status = -1
        let info = '未发现短信检查'
        let nowtime = new Date().getTime()
        console.log('---model--',model)
        if (model.length > 0) {
            console.log('model--',model)
            if (model[0].smscheck) {
                status = -2
                info = '短信已经检测'
            } else if (nowtime - 30 * 60 * 1000 <= model[0].smstime && model[0].smstime <= nowtime) {
                status = 0
                info = '短信验证通过'
                let smscheck = await table.findOneAndUpdate(
                    {
                        phone: model.phone
                    },
                    {
                        'smscheck': true
                    })
            } else {
                info = '短信已经超时'
                status = -3
            }
        }
        db.close()
        ctx.body = await { status }
    }
  }
  export default new alisms()
