import './bracket.css'
import { useCallback, useEffect, useState } from 'react'
import DRAWS from './draws2024.json'
import { playerById } from './idb'

export function BracketMatch({ p1, p2, hidden, winner, setWinner, idx }) {
	return (
		<div className={`bracket-match ${hidden ? 'bracket-hidden' : ''}`}>
			<div data-winner={0} data-idx={idx} onClick={setWinner} className={`bracket-player ${winner === 0 ? 'bracket-winner' : ''}`}>{p1}</div>
			<div data-winner={1} data-idx={idx} onClick={setWinner} className={`bracket-player ${winner === 1 ? 'bracket-winner' : ''}`}>{p2}</div>
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

// [0, 1, 1, 2, 2, 2, 2]
// 0, 1, 3, 7
export function BracketRound({ r, players, winners, setWinner }) {
	const match_count = r / 2
	const base_idx = match_count - 1

	const matches = new Array(match_count)
	if (players) {
		for (let i = 0; i < match_count; i++) {
			const a_id = players[2 * i]
			const x_id = players[2 * i + 1]
			matches[i] = <BracketMatch
				key={i}
				p1={Number.isInteger(a_id) ? playerById.get(a_id).name : ''}
				p2={Number.isInteger(x_id) ? playerById.get(x_id).name : ''}
				winner={winners[base_idx + i]}
				idx={base_idx + i}
				setWinner={setWinner}
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

// winners is an Array of 0 or 1
export function Bracket({ winners, setWinner, draws }) {
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
				<BracketRound r={64} key={6} players={draws} winners={winners} setWinner={setWinner} />
				<BracketRound r={32} key={5} winners={winners} setWinner={setWinner} />
				<BracketRound r={16} key={4} winners={winners} setWinner={setWinner} />
				<BracketRound r={8} key={3} winners={winners} setWinner={setWinner} />
				<BracketRound r={4} key={2} winners={winners} setWinner={setWinner} />
				<BracketRound r={2} key={1} winners={winners} setWinner={setWinner} />
			</div>
		</>
	)
}

export function BracketCard({ hideBracket }) {
	const draws = DRAWS.M
	const [winners, setWinners] = useState(() => {
		let len = 0
		for (let i = 1; i < draws.length; i *= 2) {
			len += i
		}
		return new Array(len).fill(0)
	})

	const setWinner = useCallback((e) => {
		const { idx, winner } = e.target.dataset
		setWinners(w => {
			const n = [...w]
			console.log(idx, winner)
			n[Number(idx)] = Number(winner)
			return n
		})
	}, [setWinners])

	return (
		<div className="bracket-card card">
			<div className="card-header">
				<div className="card-close" onClick={hideBracket}>x</div>
			</div>
			<div className="card-content">
				<div>
					<Bracket winners={winners} draws={draws} setWinner={setWinner} />
				</div>
			</div>
		</div>
	)
}
