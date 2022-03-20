
import chai, {expect, should} from 'chai'
chai.should()
import chaiHttp from 'chai-http'
import HttpStatus from 'http-status-codes'
import {} from 'mocha'
import {User} from '../src/Wrappers/User'
import {connection, connect, disconnect} from "../db"
import { server } from "../src"
import jwt_decode  from 'jwt-decode'
import crypto from "crypto"

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
    username: `${makePassword()}`,
    private_key: undefined,
    jwt: undefined,
    root_id: undefined
}

let custom_group_id = 0



before(async function() {
    await connect();
    await connection.elements.deleteMany({})
    await connection.sections.deleteMany({})
    await connection.entries.deleteMany({})
    await connection.groups.deleteMany({})
    await connection.users.deleteMany({})
});

after(async function(){
    await disconnect();
    process.exit(1)
})

describe("User", async function(){
    it("should create a new normal user", function(done){
        chai.request(server).put("/auth/register/", ).send(user)
        .end((err, res)=>{
            res.should.have.status(HttpStatus.CREATED)
            res.body.should.have.property("private_key")
            user.private_key = res.body.private_key
            res.body.should.have.property("user_data")
            res.body.user_data.should.have.property('_id').to.be.a("number")
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
        const login_data = {
            email:user.email, 
            password_hash: user.password_hash,
            signature: crypto.sign("sha256", Buffer.from(`${user.email}`), {
                key: user.private_key,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            })
        }
        
        chai.request(server).put("/auth/login/").send(login_data)
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
                
                user.jwt = jwt
                
                
                
                done()
            })
    })
    
    it("should receive all data corresponding to the user", function(done){
        
        chai.request(server).get("/users/").auth(user.jwt, { type: 'bearer' }).send()
            .end((err, res)=>{
                res.should.have.status(HttpStatus.OK)
                res.body.should.have.property("_email")
                res.body.should.have.property("_role")
                res.body.should.have.property("_forename")
                res.body.should.have.property("_surname")
                res.body.should.have.property("_display_name")
                res.body.should.have.property("_enabled")
                res.body.should.have.property("_root_id")
                user.root_id = res.body._root_id
                res.body.should.have.property("_profile_picture")
                
                done()
            })
    })
    
    it("should create the first custom group", function(done){
        const group_data = {
            name: "Servers",
            supergroup_id: user.root_id,
            icon: "test"
            
        }
        chai.request(server).put("/groups/").auth(user.jwt, { type: 'bearer' }).send(group_data)
            .end((err, res)=>{
                
                res.body.should.have.property("_id")
                res.body._id.should.be.a("number")
                custom_group_id = res.body._id
                
                res.body.should.have.property("_entries")
                res.body._entries.should.be.an("array")
                
                res.body.should.have.property("_subGroups")
                res.body._subGroups.should.be.an("array")
                
                res.body.should.have.property("_name")
                res.body._name.should.be.a("string")
                
                res.body.should.have.property("_pos_index")
                res.body._pos_index.should.be.a("number")
                
                res.body.should.have.property("_icon")
                res.body._icon.should.be.a("string")
                
                res.body.should.have.property("_supergroup_id")
                res.body._supergroup_id.should.be.a("number")
                res.body._supergroup_id.should.eql(user.root_id)
                
                done()
                
            })
    })
    
    it("should return all groups", function(done){
       chai.request(server).get("/groups/").auth(user.jwt, { type: 'bearer' }).send()
            .end((err, res)=>{                
                done()

            })
    })
    
    it("should delete the previously created custom group", function(done){
        chai.request(server).delete(`/groups/${custom_group_id}`).auth(user.jwt, { type: 'bearer' }).send()
            .end((err, res)=>{
                res.should.have.status(HttpStatus.OK)
                done()
             })
    })
})
