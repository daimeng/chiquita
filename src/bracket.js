import './bracket.css'
import { useCallback, useEffect, useState } from 'react'

export function BracketMatch({ winner }) {
	return (
		<div className="bracket-match">
			<div className="bracket-player">Player 1</div>
			<div className="bracket-player">Player 2</div>
		</div>
	)
}

export function BracketRound({ r, matches }) {
	const test = new Array(r / 2).fill(null)
	return (
		<div className="bracket-round">
			{
				test.map((a, b) => {
					return <BracketMatch />
				})
			}
		</div>
	)
}

export function Bracket() {
	return (
		<>
			<div className="bracket">
				<BracketRound r={128} key={128} />
				<BracketRound r={64} key={64} />
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
					<Bracket />
				</div>
			</div>
		</div>
	)
}
