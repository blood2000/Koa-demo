

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
      console.log(filterObj)
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

  async allmore(ctx) {
    let success = false
    let paramsdb = null
    let querybase64 = ctx.query.q
    let paramsdbname = {}
    let datastr = {}
    let filterObjs = null
    try {
      // 将请求的数据进行解码
      filterObjs = JSON.parse(Buffer.from(querybase64, 'base64').toString())
      paramsdb = filterObjs.dball
      success = filterObjs.s
      paramsdbname = filterObjs.db
    } catch (error) {
      console.log(error)
    }
    if (success) {
      let db = await MongoClient.connect(dbunit.getDBStr(paramsdbname))
      let imgarray = []
      let objarray = []
      for (let item in paramsdb) {
        console.log(paramsdb[item])
        let paramstablename = paramsdb[item].table
        let filterObj = paramsdb[item].a
        let subopt = paramsdb[item].b
        let sort = paramsdb[item].sort || { '_id': -1 }
        let limit = Number.parseInt(paramsdb[item].prepage || 30)
        let skip = Number.parseInt(paramsdb[item].page || 0) * limit
        let collection = db.collection(paramstablename)
        let options = []
        let findmatch = false
        if (filterObj) {
          filterObj.forEach((element) => {
            let obj = {}
            let type = '$' + element.type
            obj[type] = element.data || {}
            dbunit.changeModelId(obj[type])
            if (type == '$project') {
              obj[type]._id = 1
              obj[type]._delete = 1
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
        if (subopt) {
          let inarray = []
          let submatch = {}
          submatch['$match'] = {}
          if (datastr[subopt.index]) {
            datastr[subopt.index].data.forEach(iditem => {
              inarray.push(dbunit.getObjectID(iditem[subopt.oid]))
            })
          }
          submatch['$match'][subopt.sid] = { '$in': inarray }
          dbunit.changeModelId(submatch['$match'])
          options.push(submatch)
        }

        options.push({ $group: { _id: null, count: { $sum: 1 } } })
        let cursor = collection.aggregate(options)
        let group = await cursor.toArray()
        let count = 0
        if (group && group.length > 0) {
          count = group[0].count
        }
        console.log(count)
        options.pop()
        let arr = Object.keys(sort)
        if (arr.length > 0) {
          options.push({ '$sort': sort })
        }
        options.push({ '$skip': skip })
        options.push({ '$limit': limit })
        console.log(options, sort)
        let tablecursor = collection.aggregate(options)
        let data = []
        data = await tablecursor.toArray()
        dbcontroller.getimgurl(data, imgarray, objarray)
        datastr[item] = {
          data,
          'count': count,
          'table': paramstablename
        }
        //console.log(datastr[item], imgarray, objarray)
      }
      if (imgarray.length > 0) {
        let collection = db.collection('images')
        let options = []
        let objproject = {}
        let submatch = {}
        objproject['$project'] = { fileurl: true, _id: true }
        submatch['$match'] = {}
        submatch['$match']['_id'] = { '$in': imgarray }
        dbunit.changeModelId(submatch['$match'])

        options.push(objproject)
        options.push(submatch)
        let tablecursor = collection.aggregate(options)
        let data = []
        data = await tablecursor.toArray()
        console.log(data, imgarray)
        objarray.forEach((item) => {
          let itemobj = item.obj
          let itemkey = item.key
          let itemimg = itemkey.replace('_id', '')
          if (_.isArray(itemobj[itemkey])) {
            itemobj[itemimg] = []
            itemobj[itemkey].forEach((imgid) => {
              console.log(itemobj[itemkey], imgid)
              let imgobj = _.find(data, { _id: imgid })
              if (imgobj) {
                itemobj[itemimg].push('http://' + imgobj.fileurl)
              }
            })
          } else {
            //console.log(item, itemobj[itemkey], itemkey)
            let imgobj = _.find(data, { _id: itemobj[itemkey] })
            if (imgobj) {
              itemobj[itemimg] = 'http://' + imgobj.fileurl
            }
          }
        })
      }
      db.close()
    }
    let nowtime = new Date().getTime()
    console.log(datastr)
    ctx.body = await {
      'data': datastr,
      'nowtime': nowtime
    }
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
      MongoClient.connect(dbunit.getDBStr('landlord')).then(db => {
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
        console.log("~~~~~~", options)
        options.push({ '$limit': 1 })
        let cursor = table.aggregate(options)
        cursor.toArray().then(obj => {
          console.log(obj)
          if (obj.length > 0) {
            logindata.login = true
            logindata.user = obj[0].tel
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
    var token = ''
    var code = -1
    var message = '登录失败'
    if (dbmodel.login) {
      token = jwt.sign(dbmodel, 'nanguo', { expiresIn: 60 * 60 * 24 * 30 })
      code = 0
      message = '登录成功'
    }

    let nowtime = new Date().getTime()
    this.body = {
      code,
      token,
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