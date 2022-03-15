import { user_reset } from './Sql'
import chai from 'chai'
chai.should()
import chaiHttp from 'chai-http'
import HttpStatus from 'http-status-codes'
import {} from 'mocha'
import {User} from '../src/Wrappers/User'
import {connection, connect, disconnect} from "../db"
import { server } from "../src"
import jwt_decode  from 'jwt-decode'    

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
            res.body.should.have.property("private_key")
            res.body.should.have.property("user_data")
            console.log(res.body.user_data)
            res.body.user_data.should.have.property('_id').eql(1)
            res.body.user_data.should.have.property('_email').eql(user.email)
            res.body.user_data.should.have.property('_password_hash').eql(user.password_hash)
            res.body.user_data.should.have.property('_forename').eql(user.forename)
            res.body.user_data.should.have.property('_surname').eql(user.surname)
            res.body.user_data.should.have.property('_display_name').eql(user.display_name)
            res.body.user_data.should.have.property('_role').eql(user.role)
            done()
        })
    })
    
    it("should login the user", function(done){
        chai.request(server).put("/auth/login/", ).send({email:user.email, password_hash: user.password_hash})
            .end((err, res)=>{
                res.should.have.status(HttpStatus.OK)
                res.body.should.have.property('jwt')
                
                const jwt_regex = /^([a-zA-Z0-9_=]+)\.([a-zA-Z0-9_=]+)\.([a-zA-Z0-9_\-\\/=]*)/
                const jwt = res.body.jwt
                if(!jwt_regex.test(jwt))
                    throw new Error("Response does not contain a valid Java Web Token!")
                
                const decoded_jwt = jwt_decode(jwt)
                decoded_jwt.should.have.property('id')
                decoded_jwt.should.have.property('exp')
                decoded_jwt.should.have.property('iat')
                
                
                
                done()
            })
    })
})
