import tournaments from './tournaments.json'
import { glicko } from './glicko'
import { initDB, playerById } from "./idb"

// current pointer
export let player_ratings = new Map()

// match keyed
export let rating_changes = new Map()

// tournament keyed
export const all_ratings = []
export const all_ranks = []
export const all_ranks_by_id = []

export const G = glicko()
export const CANONICAL_RD = 100

export const init = initDB().then(async (db) => {
	let p = Promise.resolve()

	for (let i in tournaments) {
		const event_id = tournaments[i].EventId
		p = p.then(() =>
			db.getAllFromIndex('matches', 'event_id', event_id)
		).then(m => {
			const deepcopy = new Map()
			player_ratings.forEach((v, k) => {
				deepcopy.set(k, { ...v })
			})

			G.update_ratings(
				deepcopy,
				m,
				Date.parse(tournaments[i].StartDateTime),
				Date.parse(tournaments[i].EndDateTime),
				rating_changes
			)
			player_ratings = deepcopy
			all_ratings.push(player_ratings)

			const player_ranks = Array.from(player_ratings.keys())
			player_ranks.sort((playerA, playerB) => player_ratings.get(playerB).rating - player_ratings.get(playerA).rating)

			all_ranks.push(player_ranks)

			const ranks_by_id = new Map()
			const gender_count = {
				M: 0,
				W: 0,
			}
			player_ranks.forEach((playerId) => {
				if (player_ratings.get(playerId).rd > CANONICAL_RD) return

				const p = playerById.get(playerId)

				ranks_by_id.set(playerId, gender_count[p.gender])
				gender_count[p.gender] += 1
			})
			all_ranks_by_id.push(ranks_by_id)
		})
	}

	await p
	return db
})

