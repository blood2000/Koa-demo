

import { MongoClient } from 'mongodb'
import dbunit from './dbunit.js'
import jwt from 'koa-jwt'
import _ from 'lodash'

class dbcontroller {

  async all(ctx) {
    let success = false
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let querybase64 = ctx.query.q
    let filterObj = null
    let data = []
    let count = 0
    try {
      filterObj = JSON.parse(Buffer.from(querybase64, 'base64').toString())
      success = filterObj.s
    } catch (error) {

    }
    if (success) {
      let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
      let collection = db.collection(paramstable)
      let options = []
      let findmatch = false
      if (filterObj.a) {
        filterObj.a.forEach((element) => {
          let obj = {}
          let type = '$' + element.type
          obj[type] = element.data || {}
          dbunit.changeModelId(obj[type])
          if (type == '$project') {
            obj[type]._id = 1
          }
          if (type == '$match') {
            findmatch = true
            obj[type]['_delete'] = { '$ne': true }
          }
          options.push(obj)
        })
      }
      if (!findmatch) {
        let obj = {}
        obj['$match'] = {}
        obj['$match']['_delete'] = { '$ne': true }
        options.push(obj)
      }
      options.push({ $group: { _id: null, count: { $sum: 1 } } })
      let cursor = collection.aggregate(options)
      let group = await cursor.toArray()
      if (group && group.length > 0) {
        count = group[0].count
      }
      options.pop()

      let limit = Number.parseInt(filterObj.prepage || 30)
      let skip = Number.parseInt(filterObj.page || 0) * limit
      let sort = filterObj.sort || { '_id': -1 }

      options.push({ '$sort': sort })
      options.push({ '$skip': skip })
      options.push({ '$limit': limit })
      console.log(options)
      let tablecursor = collection.aggregate(options)
      data = await tablecursor.toArray()

      db.close()
    }
    let nowtime = new Date().getTime()
    console.log(data)
    ctx.body = await {
      'data': data,
      'count': count,
      'table': paramstable,
      'nowtime': nowtime
    }
    console.log('docs')
  }

  async count(ctx) {
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)
    let querybase64 = ctx.query.q

    let filterObj = JSON.parse(Buffer.from(querybase64, 'base64').toString())
    console.log(filterObj)
    let findobj = {}
    for (let item in filterObj) {
      let value = filterObj[item]
      if (value == 'true') {
        findobj[item] = true
      } else if (value == 'false') {
        findobj[item] = false
      } else {
        findobj[item] = filterObj[item]
        console.log(findobj[item])
      }
    }
    findobj['_delete'] = { '$ne': true }
    dbunit.changeModelId(findobj)
    let count = await collection.find(findobj).count()
    db.close()
    ctx.body = count
  }

  async add(ctx) {
    let model = ctx.request.body
    console.log('model11', model)
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    console.log(paramstable)
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)
    let seqid = await db.collection('lb_seq_id').findOneAndUpdate({ id: paramstable }, { $inc: { seq: 1 } }, { upsert: true })
    console.log("!!!!!!!", seqid)
    let num = seqid.value.seq.toString()
    let zero = ""
    if (num.length < 8) {
      for (var i = 0; i < (8 - num.length); i++) {
        zero += 0
      }
    }
    num = zero + num
    model.lbseqid = num
    console.log('eeee~~~~', model.lbseqid)
    dbunit.changeModelId(model)
    let inserted = await collection.insert(model)
    if (!inserted) {
      this.throw(405, 'The model couldn\'t be added.')
    }
    db.close()
    ctx.body = await model
  }

  async modify(ctx) {
    let model = ctx.request.body
    console.log(model)
    model = JSON.parse(model)
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let id = ctx.params.id
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)
    dbunit.changeModelId(model)
    let result = await collection.updateOne({ '_id': dbunit.getObjectID(id) }, {
      $set: model
    })
    db.close()
    ctx.body = result
  }
  async remove(ctx) {
    let model = ctx.request.body
    console.log(model)
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let id = ctx.params.id
    console.log(id)
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)
    let removed = await collection.updateOne({ '_id': dbunit.getObjectID(id) }, { $set: { '_delete': true } })
    db.close()
    if (!removed) {
      ctx.throw(405, 'Unable to delete.')
    } else {
      ctx.body = '{"success":1}'
    }
  }
  //登陆

  loginuser(user) {
    return new Promise((resolve) => {
      let logindata = { 'login': false }
      MongoClient.connect(dbunit.getdbstr('landlord')).then(db => {
        let table = db.collection('ddz_user')
        let options = []
        options.push({
          '$match': {
            'pwd': user.pwd,
            'tel': user.tel,
            'lock': false,
            '_delete': { '$ne': true }
          }
        })
        options.push({ '$limit': 1 })
        let cursor = table.aggregate(options)
        cursor.toArray().then(obj => {
          if (obj.length > 0) {
            logindata.login = true
            logindata.tel = obj[0].tel
            logindata.name = obj[0].name
            logindata.db = obj[0].db
            logindata._id = obj[0]._id
            console.log(logindata)
            resolve(logindata)
          } else {
            resolve(logindata)
          }
          db.close()
        })
      })
    })
  }
  async login(ctx) {
    console.log('heheheheh')
    let user = ctx.request.body
    var dbmodel = await loginuser(user)
   // var token = ''
    var code = -1
    var message = '登录失败'
    if (dbmodel.login) {
    //  token = jwt.sign(dbmodel, 'nanguo', { expiresIn: 60 * 60 * 24 * 30 })
      code = 0
      message = '登录成功'
    }

    let nowtime = new Date().getTime()
    this.body = {
      code,
     // token,
      message,
      account: dbmodel,
      nowtime
    }
  }


  // async deletes(ctx) {
  //   let paramsdb = ctx.params.db
  //   let paramstable = ctx.params.table
  //   let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
  //   let collection = db.collection(paramstable)

  //   let findobj = {}
  //   for (let item in this.query) {
  //     let value = this.query[item]
  //     if (value == 'true') {
  //       findobj[item] = true
  //     } else if (value == 'false') {
  //       findobj[item] = false
  //     } else {
  //       findobj[item] = this.query[item]
  //       console.log(findobj[item])
  //     }
  //   }
  //   dbunit.changeModelId(findobj)
  //   console.log(findobj)
  //   let count = await collection.updateMany(findobj, { $set: { '_delete': true } })
  //   db.close()

  //   ctx.body = count
  // }

}
export default new dbcontroller()