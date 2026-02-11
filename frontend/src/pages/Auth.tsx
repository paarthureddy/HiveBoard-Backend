import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/hive-logo.jpg";
import { Loader2 } from "lucide-react";

/**
 * Authentication Page
 * 
 * This component provides the user interface for:
 * 1. User Login (Email/Password).
 * 2. User Registration (Name, Email, Password).
 * 3. Google OAuth Login.
 * 
 * It uses a Tabbed interface to switch between Login and Register forms.
 * It interacts with the AuthContext to perform actual API calls.
 */
const Auth = () => {
    const navigate = useNavigate();
    const { login, googleLogin, register, isLoading } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            if (credentialResponse.credential) {
                await googleLogin(credentialResponse.credential);
                navigate("/home");
            }
        } catch (err: any) {
            setError(err.message || "Google Login failed");
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            await login({ email, password });
            navigate("/home");
        } catch (err: any) {
            setError(err.message || "Login failed");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            await register({ name, email, password });
            navigate("/home");
        } catch (err: any) {
            setError(err.message || "Registration failed");
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(227, 217, 240)' }}>
            <Card className="w-full max-w-[400px] shadow-xl border-2 border-primary/50">
                <CardHeader className="text-center pb-2">
                    <CardDescription>Collaborative Whiteboard for Creatives</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <div className="mb-4 p-2 bg-destructive/10 text-destructive text-sm rounded text-center">{error}</div>}

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="register">Register</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Sign In
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="register">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-email">Email</Label>
                                    <Input id="reg-email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">Password</Label>
                                    <Input id="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Create Account
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError("Google Login Failed")}
                            useOneTap
                        />
                    </div>

                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button variant="link" asChild className="text-muted-foreground">
                        <Link to="/">Back to Landing</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Auth;
