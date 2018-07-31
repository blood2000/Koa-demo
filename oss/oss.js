const { STS } = require('ali-oss');
const co = require('co');
const fs = require('fs');

const path = require('path');
const conf = require('./config');

class oss{
    async oss(ctx) {
        let policy;
        if (conf.PolicyFile) {
          policy = await fs.readFileSync(path.resolve(__dirname, conf.PolicyFile)).toString('utf-8');
        }
        const client = new STS({
            accessKeyId: conf.AccessKeyId,
            accessKeySecret: conf.AccessKeySecret
          });

          console.log(conf.RoleArn, policy, conf.TokenExpireTime)
        
          const result = await co(function* () {
            const result1 = yield client.assumeRole(conf.RoleArn, policy, conf.TokenExpireTime);
            console.log(result1);
            return result1;
          })
          ctx.set('Access-Control-Allow-Origin', '*');
          ctx.set('Access-Control-Allow-METHOD', 'GET');
          ctx.body ={
              AccessKeyId: result.credentials.AccessKeyId,
              AccessKeySecret: result.credentials.AccessKeySecret,
              SecurityToken: result.credentials.SecurityToken,
              Expiration: result.credentials.Expiration
          };
        
    }

}
export default new oss()