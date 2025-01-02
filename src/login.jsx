import { login, signUp } from "./firebase";

export function Login() {
	return (
		<div>
			<button onClick={() => {
				login("daimengchen@gmail.com", "testing123")
					.then((userCredential) => {
						// Signed up
						console.log('Login successful:', userCredential.user);
					})
					.catch((error) => {
						console.error('Login error:', error);
					})
			}}>
				Login
			</button>
			<button onClick={() => {
				signUp("daimengchen@gmail.com", "testing123")
					.then((userCredential) => {
						// Signed up
						console.log('Signup successful:', userCredential.user);
					})
					.catch((error) => {
						console.error('Signup error:', error);
					})
			}}>
				Signup
			</button>
		</div>

	)
}