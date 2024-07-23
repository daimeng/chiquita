import tournaments from './tournaments.json'
import { glicko } from './glicko'
import Immutable from 'immutable'
import { initDB } from "./idb"

export let rating_changes = new Map()
export let player_ratings = new Immutable.Map()
export const all_ratings = []
window.all_ratings = all_ratings
export const G = glicko()

export const init = initDB().then(async (db) => {
	let p = Promise.resolve()

	for (let i in tournaments) {
		const event_id = tournaments[i].EventId
		p = p.then(() =>
			db.getAllFromIndex('matches', 'event_id', event_id)
		).then(m => {
			player_ratings = player_ratings.withMutations((r) => {
				G.update_ratings(r, m, Date.parse(tournaments[i].StartDateTime), Date.parse(tournaments[i].EndDateTime), rating_changes)
			})
			all_ratings.push(player_ratings)
		})
	}

	await p
	return db
})

