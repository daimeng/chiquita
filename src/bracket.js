import './bracket.css'
import { useCallback, useEffect, useState } from 'react'
import DRAWS from './draws2024.json'
import { playerById } from './idb'

export function BracketMatch({ p1, p2, hidden, winner }) {
	return (
		<div className={`bracket-match ${hidden ? 'bracket-hidden' : ''}`}>
			<div className="bracket-player">{p1}</div>
			<div className="bracket-player">{p2}</div>
		</div>
	)
}

export function PrelimRound({ prelims }) {
	const matches = new Array(64)
	for (let i = 0; i < 64; i++) {
		if (prelims.has(i)) {
			let [a_id, x_id] = prelims.get(i).split(':')
			a_id = Number(a_id)
			x_id = Number(x_id)
			matches[i] = <BracketMatch key={i} hidden={false} p1={playerById.get(a_id).name} p2={playerById.get(x_id).name} />
		} else {
			matches[i] = <BracketMatch key={i} hidden={true} p1='' p2='' />
		}
	}

	return (
		<div className="bracket-round">
			{matches}
		</div>
	)
}

export function BracketRound({ r, players }) {
	const match_count = r / 2

	const matches = new Array(match_count)
	if (players) {
		for (let i = 0; i < match_count; i++) {
			const a_id = players[2 * i]
			const x_id = players[2 * i + 1]
			matches[i] = <BracketMatch
				key={i}
				p1={Number.isInteger(a_id) ? playerById.get(a_id).name : ''}
				p2={Number.isInteger(x_id) ? playerById.get(x_id).name : ''}
			/>
		}
	} else {
		for (let i = 0; i < match_count; i++) {
			matches[i] = <BracketMatch key={i} p1='' p2='' />
		}
	}

	return (
		<div className="bracket-round">
			{matches}
		</div>
	)
}

export function Bracket({ winners, draws }) {
	const [prelims, setPrelims] = useState(() => {
		const plims = new Map()
		for (let i = 0; i < draws.length; i++) {
			if (!Number.isInteger(draws[i])) {
				plims.set(i, draws[i])
			}
		}

		return plims
	})

	return (
		<>
			<div className="bracket">
				{prelims.size && <PrelimRound prelims={prelims} />}
				<BracketRound r={64} key={64} players={draws} />
				<BracketRound r={32} key={32} />
				<BracketRound r={16} key={16} />
				<BracketRound r={8} key={8} />
				<BracketRound r={4} key={4} />
				<BracketRound r={2} key={2} />
			</div>
		</>
	)
}

export function BracketCard({ hideBracket }) {

	return (
		<div className="bracket-card card">
			<div className="card-header">
				<div className="card-close" onClick={hideBracket}>x</div>
			</div>
			<div className="card-content">
				<div>
					<Bracket winners={[]} draws={DRAWS.M} />
				</div>
			</div>
		</div>
	)
}
