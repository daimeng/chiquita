import { useCallback, useEffect, useState } from 'react'

export function BracketMatch() {
	return (
		<div>
			<div>Player 1</div>
			<div>Player 2</div>
		</div>
	)
}

export function BracketRound() {
	return (
		<BracketMatch />
	)
}

export function Bracket() {
	return (
		<BracketRound />
	)
}
