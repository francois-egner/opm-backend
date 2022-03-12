import { user_reset } from './Sql'
import chai from 'chai'
chai.should()
import chaiHttp from 'chai-http'
import HttpStatus from 'http-status-codes'
import {} from 'mocha'
import {User} from '../src/Wrappers/User'
import {connection, connect, disconnect} from "../db"
import { server } from "../src"

chai.use(chaiHttp)

function makePassword(){
    const longth = 20
    const allc = "!@#$%^&*()_+~`|}{[]:;?><,./-=0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    let passgen = '';
    for (let i = 0; i < longth; i++) {
      passgen += allc[Math.floor(Math.random() * allc.length)];
    }
    return passgen;
}

const user = {
    email: `test@test.com`,
    password_hash: `${makePassword()}`,
    role: 0,
    forename: `${makePassword()}`,
    surname: `${makePassword()}`,
    display_name: `${makePassword()}`,
    username: `${makePassword()}`
}



before(async function() {
    await connect();
    await connection.none(user_reset)
});

after(async function(){
    await disconnect();
})

describe("User", async function(){
    it("should create a new normal user", function(done){
        chai.request(server).put("/auth/register/", ).send(user)
        .end((err, res)=>{
            res.should.have.status(HttpStatus.CREATED)
            res.body.should.have.property('_id').eql(1)
            res.body.should.have.property('_email').eql(user.email)
            res.body.should.have.property('_password_hash').eql(user.password_hash)
            res.body.should.have.property('_forename').eql(user.forename)
            res.body.should.have.property('_surname').eql(user.surname)
            res.body.should.have.property('_display_name').eql(user.display_name)
            res.body.should.have.property('_role').eql(user.role)
            done()
        })
    })
})
