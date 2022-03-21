import {readFileSync} from "fs"
import { Exception } from './Exception'

export let configuration: Types.Configuration
export let loaded = false

export const loadConfiguration = () =>{
    try{
        configuration = JSON.parse(readFileSync(process.env.CONFIG!, 'utf-8'))
        loaded = true
    }catch(err: unknown){
        throw new Exception("Failed to load configuration!", Types.ExceptionType.RuntimeError)
    }
}

