import './bracket.css'
import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import DRAWS from './draws2024.json'
import { playerById } from './idb'
import { ISO3Name, ISO3to2 } from './country-map'
import { all_ratings } from './ratings'

export function BracketMatch({ RenderPlayer, p1, p2, players, setPlayer, idx, showRatings }) {
	if (p1 === 0 || p2 === 0) {
		return (
			<div className="bracket-match bracket-hidden">
				<div className="bracket-player"></div>
				<div className="bracket-player"></div>
			</div>
		)
	}
	return (
		<div className="bracket-match">
			{p1 != null
				? <RenderPlayer playerid={p1} idx={idx} onClick={setPlayer} players={players} showRatings={showRatings} />
				: <div className="bracket-player"></div>
			}
			{p2 != null
				? <RenderPlayer playerid={p2} idx={idx} onClick={setPlayer} players={players} showRatings={showRatings} />
				: <div className="bracket-player"></div>
			}
		</div>
	)
}

function MatchPlayer({ playerid, idx, onClick, players, showRatings }) {
	console.log(playerid)
	const pid = Number(playerid)
	const latest_ratings = all_ratings[all_ratings.length - 1]
	const player = playerById.get(pid)
	const latest = latest_ratings.get(pid)
	let r = latest ? Math.floor(latest.rating) : 0
	r = Math.min(Math.max(r - 1400, 100), 1000)

	return (
		<div data-id={playerid} data-idx={idx} onClick={onClick}
			className={`bracket-player ${players[idx] === playerid ? 'bracket-winner' : ''}`}>
			<span className={`fi fis fi-${ISO3to2[player.org]}`}></span>
			<span className="bracket-org">{player.org}</span>
			{" "}
			{player.name}
			{showRatings && <span className="bracket-ratings" style={{ backgroundPositionY: r }}>{latest && Math.floor(latest.rating)}</span>}
		</div>
	)
}

function MatchDoubles({ playerid: pairid, idx, onClick, players }) {
	const [a_id, b_id] = pairid.split(':')
	const a = playerById.get(Number(a_id))
	const b = playerById.get(Number(b_id))

	return (
		<div data-id={pairid} data-idx={idx} onClick={onClick}
			className={`bracket-player ${players[idx] === pairid ? 'bracket-winner' : ''}`}>
			<span className={`fi fis fi-${ISO3to2[a.org]}`}></span>
			<span className="bracket-org">{a.org}</span>
			{" "}
			{a.name}/{b.name}
		</div>
	)
}

function MatchTeams({ playerid: country, idx, onClick, players }) {
	return (
		<div data-id={country} data-idx={idx} onClick={onClick}
			className={`bracket-player ${players[idx] === country ? 'bracket-winner' : ''}`}>
			<span className={`fi fis fi-${ISO3to2[country]}`}></span>
			<span className="bracket-org">{country}</span>
			{" "}
			{ISO3Name[country]}
		</div>
	)
}

// [0, 1, 1, 2, 2, 2, 2]
// 0, 1, 3, 7
export function BracketRound({ RenderPlayer, r, players, setPlayer, showRatings }) {
	const match_count = r / 2
	const base_idx = match_count - 1

	const matches = new Array(match_count)
	for (let i = 0; i < match_count; i++) {
		const a_id = players[r - 1 + 2 * i]
		const x_id = players[r + 2 * i]

		matches[i] = <BracketMatch
			key={i}
			p1={a_id}
			p2={x_id}
			idx={base_idx + i}
			players={players}
			setPlayer={setPlayer}
			showRatings={showRatings}
			RenderPlayer={RenderPlayer}
		/>
	}

	return (
		<div className="bracket-round">
			{matches}
		</div>
	)
}

export function Bracket({ RenderPlayer, players, setPlayer, showRatings }) {
	let roundof = (players.length + 1) / 2
	const rounds = []
	// roundof 2 is finals
	while (roundof > 1) {
		rounds.push(
			<BracketRound
				r={roundof} key={roundof}
				RenderPlayer={RenderPlayer}
				players={players} setPlayer={setPlayer} showRatings={showRatings} />
		)
		roundof /= 2
	}

	return (
		<div className="bracket">
			{rounds}
		</div>
	)
}

const EVENTS = ['M', 'W', 'X', 'MT', 'WT']

export function BracketCard({ hideBracket }) {
	const [event, setEvent] = useState('M')
	const [showRatings, setShowRatings] = useState(false)
	const toggleRatings = useCallback(() => {
		setShowRatings(r => !r)
	}, [setShowRatings])

	const refM = useRef(null)
	const refW = useRef(null)
	const refX = useRef(null)
	const refMT = useRef(null)
	const refWT = useRef(null)

	return (
		<div className="bracket-card card">
			<div className="card-header">
				<div className="bracket-event">
					{EVENTS.map(e =>
						<button type="button" key={e} className={e === event ? `active` : ''} onClick={() => setEvent(e)}>{e}</button>
					)}
				</div>
				<div className="show-ratings" onClick={toggleRatings}>[{showRatings ? `x` : ' '}]show ratings</div>
				<button type="button" className="export-brackets" onClick={() => {
					refM.current.getCode()
				}}>Export</button>
				<div className="card-close" onClick={hideBracket}>x</div>
			</div>
			<div className="card-content">
				<BracketContent
					ref={refM}
					hidden={event !== 'M'}
					event={'M'}
					showRatings={showRatings}
					RenderPlayer={MatchPlayer}
				/>
				<BracketContent
					ref={refW}
					hidden={event !== 'W'}
					event={'W'}
					showRatings={showRatings}
					RenderPlayer={MatchPlayer}
				/>
				<BracketContent
					className="bracket-doubles"
					ref={refX}
					hidden={event !== 'X'}
					event={'X'}
					showRatings={showRatings}
					RenderPlayer={MatchDoubles}
				/>
				<BracketContent
					ref={refMT}
					hidden={event !== 'MT'}
					event={'MT'}
					showRatings={showRatings}
					RenderPlayer={MatchTeams}
				/>
				<BracketContent
					ref={refWT}
					hidden={event !== 'WT'}
					event={'WT'}
					showRatings={showRatings}
					RenderPlayer={MatchTeams}
				/>
			</div>
		</div>
	)
}

const BracketContent = forwardRef(({ className, RenderPlayer, event, showRatings, hidden }, ref) => {
	const draws = DRAWS[event]

	const [players, setPlayers] = useState(() => {
		// 1 + 2 + 4 + 8 + 16 + 32
		const draw_idx = draws.length - 1

		const p = new Array(draws.length * 2 - 1).fill(null)

		// add prelims
		p.push(...new Array(draws.length * 2).fill(0))

		for (let i = 0; i < draws.length; i++) {
			const idx = draw_idx + i
			if (Array.isArray(draws[i])) {
				const [a_id, x_id] = draws[i]
				p[idx] = null
				p[idx * 2 + 1] = String(a_id)
				p[idx * 2 + 2] = String(x_id)
			} else {
				p[idx] = String(draws[i])
			}
		}
		return p
	})

	const setPlayer = useCallback((e) => {
		const { idx, id } = e.target.dataset
		setPlayers(p => {
			const n = [...p]

			let parent = Number(idx)
			while (parent >= 0) {
				const replaced = n[parent]
				// toggle off
				if (n[parent] === id) {
					n[parent] = null
				} else { // toggle on
					n[parent] = id
				}
				// don't fill to root
				if (replaced == null) break

				// check if parent is same as replaced
				parent = Math.floor((parent - 1) / 2)
				if (n[parent] != replaced) break
			}

			return n
		})
	}, [setPlayers])

	useImperativeHandle(ref, () => ({
		getCode() {
			console.log(players)
		}
	}), [players])

	return (
		<div className={`${className} ${hidden ? 'hidden' : ''}`}>
			<Bracket RenderPlayer={RenderPlayer} players={players} draws={draws} setPlayer={setPlayer} showRatings={showRatings} />
		</div>
	)
})