

import { MongoClient } from 'mongodb'
import dbunit from './dbunit.js'

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
    
        let findobj = {}
        for (let item in this.query) {
          let value = this.query[item]
          if (value == 'true') {
            findobj[item] = true
          } else if (value == 'false') {
            findobj[item] = false
          } else {
            findobj[item] = this.query[item]
          }
        }
        findobj['_delete'] = { '$ne': true }
        console.log(table, findobj, this.query)
        dbunit.changeModelId(findobj)
        let count = await collection.find(findobj).count()
        db.close()
    
        ctx.body = count
      }
}
export default new dbcontroller()