import tournaments from './tournaments.json'
import { playerById } from "./idb"
import { init } from "./ratings"

export const ELO_K = 32
export const INITIAL_ELO = 1500

// Per-discipline exports: keyed by discipline ('MD', 'WD', 'X')
export const doubles_all_ratings_by_discipline = { MD: [], WD: [], X: [] }
export const doubles_all_ranks_by_discipline = { MD: [], WD: [], X: [] }
export const doubles_all_ranks_by_id_by_discipline = { MD: [], WD: [], X: [] }
export const doubles_rating_changes = new Map()

// Legacy exports pointing at XD (mixed) pool — kept for graph/card compat
export let doubles_player_ratings = new Map()
export let doubles_all_ratings = []
export let doubles_all_ranks = []
export let doubles_all_ranks_by_id = []

function matchGender(match, discipline) {
	if (discipline === 'MD') return match.gender === 'M'
	if (discipline === 'WD') return match.gender === 'W'
	// X = mixed: anything that isn't M-only or W-only
	return match.gender !== 'M' && match.gender !== 'W'
}

function runElo(allTournamentMatches, discipline) {
	const all_ratings = []
	const all_ranks = []
	const all_ranks_by_id = []
	let player_ratings = new Map()

	for (let i = 0; i < allTournamentMatches.length; i++) {
		const matches = allTournamentMatches[i]
		const deepcopy = new Map()
		player_ratings.forEach((v, k) => { deepcopy.set(k, { ...v }) })

		for (let j = 0; j < matches.length; j++) {
			const match = matches[j]
			if (!matchGender(match, discipline)) continue

			const a1_id = match.a_id
			const a2_id = match.b_id
			const x1_id = match.x_id
			const x2_id = match.y_id

			if (!deepcopy.has(a1_id)) deepcopy.set(a1_id, { rating: INITIAL_ELO, games: 0, last_active: 0 })
			if (a2_id > 0 && !deepcopy.has(a2_id)) deepcopy.set(a2_id, { rating: INITIAL_ELO, games: 0, last_active: 0 })
			if (!deepcopy.has(x1_id)) deepcopy.set(x1_id, { rating: INITIAL_ELO, games: 0, last_active: 0 })
			if (x2_id > 0 && !deepcopy.has(x2_id)) deepcopy.set(x2_id, { rating: INITIAL_ELO, games: 0, last_active: 0 })

			const r_a1 = deepcopy.get(a1_id).rating
			const r_a2 = a2_id > 0 ? deepcopy.get(a2_id).rating : r_a1
			const r_x1 = deepcopy.get(x1_id).rating
			const r_x2 = x2_id > 0 ? deepcopy.get(x2_id).rating : r_x1

			const rating_A = (r_a1 + r_a2) / 2
			const rating_X = (r_x1 + r_x2) / 2

			const E_A = 1 / (1 + Math.pow(10, (rating_X - rating_A) / 400))
			const E_X = 1 - E_A

			const S_A = match.res_a > match.res_x ? 1 : 0
			const S_X = 1 - S_A

			const delta_A = ELO_K * (S_A - E_A)
			const delta_X = ELO_K * (S_X - E_X)

			const new_r_a1 = r_a1 + delta_A / 2
			const new_r_a2 = r_a2 + delta_A / 2
			const new_r_x1 = r_x1 + delta_X / 2
			const new_r_x2 = r_x2 + delta_X / 2

			const match_time = Date.parse(tournaments[i].EndDateTime)

			const p_a1 = deepcopy.get(a1_id)
			p_a1.rating = new_r_a1
			p_a1.games += 1
			p_a1.last_active = match_time

			if (a2_id > 0) {
				const p_a2 = deepcopy.get(a2_id)
				p_a2.rating = new_r_a2
				p_a2.games += 1
				p_a2.last_active = match_time
			}

			const p_x1 = deepcopy.get(x1_id)
			p_x1.rating = new_r_x1
			p_x1.games += 1
			p_x1.last_active = match_time

			if (x2_id > 0) {
				const p_x2 = deepcopy.get(x2_id)
				p_x2.rating = new_r_x2
				p_x2.games += 1
				p_x2.last_active = match_time
			}

			// Only write rating changes once (from first discipline to process this match)
			// We key by match.id + discipline to allow per-discipline lookup
			doubles_rating_changes.set(`${match.id}:${discipline}`, {
				r1_1: r_a1, r1_2: r_a2, r2_1: r_x1, r2_2: r_x2,
				new_r1_1: new_r_a1, new_r1_2: new_r_a2, new_r2_1: new_r_x1, new_r2_2: new_r_x2,
			})
		}

		player_ratings = deepcopy
		all_ratings.push(player_ratings)

		const event_time = Date.parse(tournaments[i].EndDateTime)
		const one_year_ago = event_time - 365 * 24 * 60 * 60 * 1000

		const player_ranks = Array.from(player_ratings.keys())
			.filter(playerId => player_ratings.get(playerId).last_active >= one_year_ago)
		player_ranks.sort((a, b) => player_ratings.get(b).rating - player_ratings.get(a).rating)
		all_ranks.push(player_ranks)

		const ranks_by_id = new Map()
		const gender_count = { M: 0, W: 0 }
		let overall_count = 0
		player_ranks.forEach((playerId) => {
			const p = playerById.get(playerId)
			if (!p) return
			ranks_by_id.set(playerId, {
				MD: p.gender === 'M' ? gender_count.M : undefined,
				WD: p.gender === 'W' ? gender_count.W : undefined,
				X: overall_count,
			})
			if (p.gender === 'M') gender_count.M += 1
			else if (p.gender === 'W') gender_count.W += 1
			overall_count += 1
		})
		all_ranks_by_id.push(ranks_by_id)
	}

	return { all_ratings, all_ranks, all_ranks_by_id, player_ratings }
}

export const init_doubles = init.then(async (db) => {
	// Fetch all matches per tournament first
	let p = Promise.resolve([])
	const allTournamentMatches = []

	for (let i in tournaments) {
		const event_id = tournaments[i].EventId
		p = p.then(() =>
			db.getAllFromIndex('doubles', 'event_id', event_id)
		).then(matches => {
			allTournamentMatches.push(matches)
		})
	}

	await p

	// Run three independent Elo pools
	for (const discipline of ['MD', 'WD', 'X']) {
		const result = runElo(allTournamentMatches, discipline)
		doubles_all_ratings_by_discipline[discipline] = result.all_ratings
		doubles_all_ranks_by_discipline[discipline] = result.all_ranks
		doubles_all_ranks_by_id_by_discipline[discipline] = result.all_ranks_by_id
	}

	// Point legacy exports at XD (mixed) for backward compat with graph, etc.
	// App code that cares about discipline should use the _by_discipline exports
	doubles_all_ratings = doubles_all_ratings_by_discipline.X
	doubles_all_ranks = doubles_all_ranks_by_discipline.X
	doubles_all_ranks_by_id = doubles_all_ranks_by_id_by_discipline.X
	doubles_player_ratings = doubles_all_ratings_by_discipline.X[doubles_all_ratings_by_discipline.X.length - 1] || new Map()

	return db
})
