import pgPromise, { IDatabase } from "pg-promise";
import { Params } from "./Params";
import { User } from "./Wrappers/User";
import {logger} from './Utils/Logger';
import {connect, connection, disconnect} from './Sql'

const main = async ()=>{
    try{
        await connect()
        const new_user = await User.create({email: "mail@francois-egner.de", password_hash: "testhash", role: Params.User.Role.normal, forename: "Francois", surname: "Egner", display_name: "Francois Egner"})
        await disconnect()
        
        
        
    }catch(ex: any){
        logger.error(`[${ex.type}] ${ex.message} @ ${ex.code}`);
    }
    

}
main();
