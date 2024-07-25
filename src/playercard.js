import { useEffect, useState } from "react"
import { playerById, tournamentById } from "./idb"
import { init, rating_changes } from "./ratings"

export function PlayerCard({ playerid, showPlayer, hidePlayer }) {
	const player = playerById.get(playerid)
	const [matches, setMatches] = useState([])

	useEffect(() => {
		init.then((db) => {
			return Promise.all([
				db.getAllFromIndex('matches', 'a_id', playerid),
				db.getAllFromIndex('matches', 'x_id', playerid)
			])
		}).then(([matches_a, matches_x]) => {
			// decorate matches with their rating changes
			const all_matches = []
			for (let i = matches_a.length - 1; i >= 0; i--) {
				matches_a[i].change = Math.round(rating_changes.get(matches_a[i].id))
				matches_a[i].start = Date.parse(tournamentById.get(matches_a[i].event_id).StartDateTime)
				all_matches.push(matches_a[i])
			}
			for (let i = matches_x.length - 1; i >= 0; i--) {
				matches_x[i].change = Math.round(rating_changes.get(matches_x[i].id))
				matches_x[i].start = Date.parse(tournamentById.get(matches_x[i].event_id).StartDateTime)
				all_matches.push(matches_x[i])
			}
			all_matches.sort((a, b) => b.start - a.start)
			setMatches(all_matches)
		})
	}, [playerid])

	return (
		<div className="player-card card">
			<div className="card-header">
				{player.name}
				<div className="card-close" onClick={hidePlayer}>x</div>
			</div>
			<div className="card-content">
				{matches.map(m => {
					const tourney = tournamentById.get(m.event_id)
					const scores = m.scores.split(',').map(x => x.split('-'))
					if (m.a_id === playerid) {
						return <div key={m.id} className={`match-row ${m.change < 0 ? 'match-loss' : ''}`}>
							<div className="match-rating-change">{m.change}</div>
							<div className="match-res">{m.res_a} - {m.res_x}</div>
							<div className="match-opponent" data-playerid={m.x_id} onClick={showPlayer}>{playerById.get(m.x_id).name}</div>
							<div className="match-date">{tourney.StartDate}</div>
							<div className="match-event">{tourney.ShortName}</div>
							<div className="match-scores">
								{scores.map((set, i) =>
									<div key={i} className="match-scores-set">
										<div>{set[0]}</div>
										<div>{set[1]}</div>
									</div>
								)}
							</div>
						</div>
					} else {

						return <div key={m.id} className={`match-row ${m.change > 0 ? 'match-loss' : ''}`}>
							<div className="match-rating-change">{-m.change}</div>
							<div className="match-res">{m.res_x} - {m.res_a}</div>
							<div className="match-opponent" data-playerid={m.a_id} onClick={showPlayer}>{playerById.get(m.a_id).name}</div>
							<div className="match-date">{tourney.StartDate}</div>
							<div className="match-event">{tourney.ShortName}</div>
							<div className="match-scores">
								{scores.map((set, i) =>
									<div key={i} className="match-scores-set">
										<div>{set[1]}</div>
										<div>{set[0]}</div>
									</div>
								)}
							</div>
						</div>
					}
				})}
			</div>
		</div>
	)
}

export function EmptyCard({ hidePlayer }) {
	return (
		<div className="player-card card empty-card">
			<div className="card-header">
				<div className="card-close" onClick={hidePlayer}>x</div>
			</div>
			<div className="card-content">
			</div>
		</div>
	)
}