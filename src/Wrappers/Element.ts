import { Types } from "../Types"
import { elementQueries } from "../Sql/index"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { connection as conn } from "../Sql"

/**
 * An Element is a part of a section. It represents an information that should be stored in a section.
 * The name of an element is like a title (e.g. Username) and the value is the actual information that
 * should be stored (e.g. the actual username)
 */
export class Element{

    /**
     * Unique identifier of element
     */
    private _id: number

    /**
     * Name of element
     */
    private _name: string

    /**
     * Position (index) of element in section
     */
    private _pos_index: number

    /**
     * Unique identifier of section the element is part of
     */
    private _section_id: number

    /**
     * Value of element
     */
    private _value: string

    /**
     * Type of element (e.g. password, cleartext etc.)
     */
    private _type: Types.Element.ElementType

    constructor(id: number, name: string, value: string, type: Types.Element.ElementType, pos_index: number, section_id: number){
        this._name = name
        this._value = value
        this._type = type
        this._id = id
        this._section_id = section_id
        this._pos_index = pos_index
    }

    /**
    * @param name Name of new element
    * @param value Actual value of new element
    * @param type Type of element (e.g. password, cleartext etc.)
    * @param pos_index Position (index) of element in section
    * @param section_id Unique identifier of section the new element will be part of
    * @param connection Task/Transaction for querying
    */
    static async create({name, value, type, pos_index = 0, section_id, connection=conn} : Types.Element.Params.create): Promise<Element>{
        try{              
            const queryData = [name,value, type, pos_index, section_id]
            const elementData = await connection.one(elementQueries.create, queryData)
            return new Element(elementData.id, elementData.name, elementData.value, elementData.type, elementData.pos_index, elementData.section_id)
        }catch(err: unknown){
            throw new Exception("Failed to create new user", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        } 
    }


    //#region Getters & Setters
    get id(): number{
        return this._id
    }

    get name(): string{
        return this._name
    }

    set name(name: string){
        this._name = name
    }

    get value(): string{
        return this._value
    }

    set value(value: string){
        this._value = value
    }

    get type(): Types.Element.ElementType{
        return this._type
    }

    set type(type: Types.Element.ElementType){
        this._type = type
    }

    get section_id(): number{
        return this._section_id
    }

    set section_id(section_id: number){
        this._section_id = section_id
    }

    get pos_index(): number{
        return this._pos_index
    }

    set pos_index(pos_index: number){
        this._pos_index = pos_index
    }
    //#endregion
}