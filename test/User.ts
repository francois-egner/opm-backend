import { user_reset } from './Sql'
import {expect} from 'chai'
import {} from 'mocha'
import {User} from '../src/Wrappers/User'
import {connection, connect, disconnect} from '../src/Sql'

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
    display_name: `${makePassword()}`
}



before(async function() {
    await connect();
    await connection.none(user_reset)
});

after(async function(){
    await disconnect();
})

describe("User", async function(){
    it("should create a new user", async function(){
        const userData = await User.create({email: user.email, password_hash: user.password_hash, role: user.role, forename: user.forename, surname: user.surname, display_name: user.display_name})
        
        expect(userData).to.be.an.instanceof(User)
        expect(userData).have.property('_id')
        expect(userData).have.property('_email')
        expect(userData).have.property('_password_hash')
        expect(userData).have.property('_forename')
        expect(userData).have.property('_surname')
        expect(userData).have.property('_display_name')
        expect(userData).have.property('_role')

        expect(userData.id).to.equal(1)
        expect(userData.email).to.equal(user.email)
        expect(userData.password_hash).to.equal(user.password_hash)
        expect(userData.forename).to.equal(user.forename)
        expect(userData.surname).to.equal(user.surname)
        expect(userData.display_name).to.equal(user.display_name)
        expect(userData.role).to.equal(0)
    })
})
