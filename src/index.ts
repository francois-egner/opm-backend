import pgPromise, { IDatabase } from "pg-promise";
import { Types } from "././Types";
import { User } from "./Wrappers/User";
import {logger} from './Utils/Logger';
import {connect, disconnect} from './Sql'

const main = async ()=>{
    try{
        await connect()
        const new_user = await User.create({email: "mail@francois-egner.de", password_hash: "testhash", role: Types.User.Role.normal, forename: "Francois", surname: "Egner", display_name: "Francois Egner"})
        await disconnect()
        
        
        
    }catch(ex: any){
        logger.error(ex.toString())
        await disconnect()
    }
    

}
main();
