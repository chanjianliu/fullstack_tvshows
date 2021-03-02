// load libraries
const morgan = require('morgan')
const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')

// SQL query
const SQL_SELECT_GENRES = 'SELECT distinct(genre) FROM genres ORDER BY genre ASC'
const SQL_SELECT_TV_SHOW_BY_GENRE = 'SELECT tvid FROM genres WHERE genre LIKE ?'
const SQL_SELECT_TV_SHOW_BY_TVID = 'SELECT tvid, NAME FROM tv_shows WHERE tvid IN ( ? ) ORDER BY NAME asc'
const SQL_SELECT_TV_SHOW_DETAIL_BY_TVID = 'SELECT * FROM tv_shows WHERE tvid = ?'

// setting PORT
const PORT = parseInt(process.env.PORT) || 3000

// configure the DB
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || 3306 // mysql default port number
const DB_USER = process.env.DB_USER || 'pebbles'
const DB_PASSWORD = process.env.DB_PASSWORD || 'pebbles'
const DB_SCHEMA = process.env.DB_SCHEMA || 'leisure'

// create connection pool
const POOL = mysql.createPool({
    host: DB_HOST,
    pool: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_SCHEMA,
    connectionLimit: 4
})

// create application
const app = express()

//configure middleware
app.use(morgan('combined'))
app.use(cors())

// Resources
// GET /genres
app.get('/api/genres', async(req, resp)=>{
    const conn = await POOL.getConnection()

    // query() will return an array of 2 elements
    // 0 = array of data retrieved, 1 = metadata of the result 
    try {
        const [ result, _ ] = await conn.query(SQL_SELECT_GENRES)
        const genres = result.map(v => v['genre']) // value of genre

        resp.status(200)
            .type('application/json')
            .json(genres)
    } catch(e) {
        console.error('Error: ')
        console.dir(e)
        resp.status(500).type('application/json').json({ error: e })
    } finally {
        conn.release()
    }
})

// GET /api/genre/:genre
app.get('/api/genre/:genre', async(req, resp)=>{
    const conn = await POOL.getConnection()
    const genre = req.params['genre']
    
    // async, await issue, thus changed to use the above promise way
    // try {

    //     // first query
    //     // the 2nd parameter array is to replace the '?' in the query string (from left to right)
    //     const [ result, _ ] = await conn.query(SQL_SELECT_TV_SHOW_BY_GENRE, [ genre ])
    //     const tvids = result.map(v => v['tvid']) // value of tvid

    //     // 2nd query
    //     [ result, _ ] = await conn.query(SQL_SELECT_TV_SHOW_BY_TVID, [ tvids ])
        
    //     resp.status(200)
    //         .type('application/json')
    //         .json(result)
    // } catch(e) {
    //     console.error('Error: ')
    //     console.dir(e)
    //     resp.status(500).type('application/json').json({ error: e })
    // } finally {
    //     conn.release()
    // }

    // promise way of conn.query

    // needed if decided to use more than one conn.query()
    conn.query(SQL_SELECT_TV_SHOW_BY_GENRE, [ genre ])
            .then((result)=>{
                const tvids = result[0].map(v => v['tvid'])
                return conn.query(SQL_SELECT_TV_SHOW_BY_TVID, [ tvids ])
            })
            .then((result) => {
                resp.status(200)
                    .type('application/json')
                    .json(result[0]) // need to select the 1st element of the return result
            })
            .catch((error)=>{
                console.error('Error: ')
                console.dir(error)
                resp.status(500).type('application/json').json({ error: error })
            })
            .finally(()=>{
                conn.release()
            })
})


// GET /api/tvshow/:id
app.get('/api/tvshow/:id', async (req, resp)=>{
    const conn = await POOL.getConnection();
    const id = req.params['id']

    conn.query(SQL_SELECT_TV_SHOW_DETAIL_BY_TVID, [ id ])
        .then((result)=>{

            if (result[0].length <= 0){
                resp.status(400)
                    .type('application/json')
                    .json({error: `tvid ${id} is not found`})
                return
            } else {
                resp.status(200)
                    .type('application/json')
                    .json(result[0][0]) // object in within another array
            }
    })
    .catch((error) => {
        console.error('Error: ')
        console.dir(error)
        resp.status(500).type('application/json').json({ error: error })
    })
    .finally(()=>{
        conn.release()
    })
})


// this is original app starter
// app.listen(PORT, ()=>{
//     console.info(`Application started on port ${PORT} at ${new Date()}`)
// })

// // starting application + check DB health before starting
// (async function() {
//     // check out a connection
//     const conn = await pool.getConenction()
//     console.info('after conn: ', conn)

//     try {
//         // ping
//         await conn.ping()
//         app.listen(PORT, ()=>{
//             console.info(`Application started on port ${PORT} at ${new Date()}`)
//         })
//         // release the connection
//         conn.release()
//     } catch(e) {
//         console.info(`Error: `, e)
//         process.exit(-1)
//     }
// })() //last bracket is to run the function, known as a IIFE (immediately invoked function expresion)

// cannot use IIFE so made into a function
// starting application + check DB health before starting

const startApp = async (app, pool) => {
    // check out a connection
    const conn = await pool.getConnection()
    console.info('after conn: ', conn)

    try {
        // ping
        await conn.ping()
        // release connection
        conn.release()
        // start app
        app.listen(PORT, ()=>{
            console.info(`Application started on port ${PORT} at ${new Date()}`)
        })
    } catch(e) {
        console.info(`Error: `, e)
        process.exit(-1)
    }
}

startApp(app, POOL)