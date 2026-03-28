import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Terminal, Loader2, ShieldCheck, Activity, Globe, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { motion } from "framer-motion";
import { useState } from "react";

const authSchema = z.object({
  username: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Company email is required").optional().or(z.literal("")),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { loginMutation, registerMutation } = useAuth();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = (data: AuthFormData) => {
    if (mode === 'login') {
      const { email, ...loginData } = data;
      loginMutation.mutate(loginData);
    } else {
      registerMutation.mutate(data);
    }
  };

  const handleDemoLogin = () => {
    loginMutation.mutate({ username: "demo", password: "demopassword" });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="min-h-screen flex bg-[#020617] relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[50%] h-full bg-indigo-600/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[50%] h-full bg-emerald-600/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2" />

      {/* Left Pane - Visual/Marketing (Desktop only) */}
      <div className="hidden lg:flex flex-1 relative bg-[#0a0f1e] overflow-hidden border-r border-white/5">
        {/* Abstract Matrix/Grid Background */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_rgba(99,102,241,0.08),transparent_70%)]" />
        
        <div className="relative z-10 p-20 flex flex-col justify-between w-full">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-indigo-500/20 ring-1 ring-white/10">
              <Terminal className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl tracking-tighter text-white">Infra-Ventry</h1>
              <p className="text-xs text-indigo-400/80 font-bold uppercase tracking-[0.2em] leading-none">Intelligence Engine</p>
            </div>
          </motion.div>

          <div className="max-w-xl">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl xl:text-6xl font-black text-white leading-[1.1] tracking-tight mb-8"
            >
              Unified Control for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Modern Infrastructure.</span>
            </motion.h2>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {[
                { icon: ShieldCheck, title: "Zero-Trust Architecture", desc: "Enterprise grade security for your monitoring nodes." },
                { icon: Activity, title: "Real-time Telemetry", desc: "Live health streaming with millisecond precision." },
                { icon: Globe, title: "Edge Observability", desc: "Global presence monitoring from over 60 regions." }
              ].map((feature, i) => (
                <motion.div key={i} variants={itemVariants} className="flex gap-4 group">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-all duration-300">
                    <feature.icon className="h-5 w-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-200 mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-sm">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500"
          >
            <span>v2.4.0 Stable</span>
            <span>Uptime 99.99%</span>
            <span>Cluster Ready</span>
          </motion.div>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-12">
             <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Terminal className="text-white h-5 w-5" />
              </div>
              <h1 className="font-display font-bold text-xl text-white">Infra-Ventry</h1>
            </div>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">
              {mode === 'login' ? 'Access Dashboard' : 'Create Account'}
            </h3>
            <p className="text-slate-400 font-medium">
              {mode === 'login' 
                ? 'Please enter your credentials to proceed.' 
                : 'Join the platform and start monitoring infrastructure.'}
            </p>
          </div>

          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.error("Form validation errors:", errors);
                // The FormField components handle displaying their own messages, 
                // but we can add more logging or global feedback here if needed.
              })} 
              className="space-y-6"
            >
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
                {mode === 'login' ? (
                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Email or Username</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input 
                                placeholder="e.g. admin@example.com" 
                                className="h-14 bg-white/5 border-white/10 rounded-2xl px-5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all duration-300"
                                {...field} 
                                value={field.value || ""}
                              />
                              <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold text-rose-500 mt-1" />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                ) : (
                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Company Email</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input 
                                placeholder="name@company.com" 
                                className="h-14 bg-white/5 border-white/10 rounded-2xl px-5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all duration-300"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold text-rose-500 mt-1" />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                <motion.div variants={itemVariants}>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-500">Password</FormLabel>
                          {mode === 'login' && (
                            <button type="button" className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">Forgot?</button>
                          )}
                        </div>
                        <FormControl>
                          <div className="relative group">
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              className="h-14 bg-white/5 border-white/10 rounded-2xl px-5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all duration-300"
                              {...field} 
                            />
                            <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[10px] uppercase font-bold text-rose-500 mt-1" />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50"
                    disabled={loginMutation.isPending || registerMutation.isPending}
                  >
                    {loginMutation.isPending || registerMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        {mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </form>
          </Form>

          {mode === 'login' && (
            <motion.div variants={itemVariants} className="mt-4 pt-4 border-t border-white/5">
              <Button
                type="button"
                onClick={handleDemoLogin}
                className="w-full h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-500 hover:text-white transition-all duration-500 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/30 group"
              >
                <Zap className="mr-2 h-4 w-4 group-hover:scale-125 transition-transform" />
                Live Demo
              </Button>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="mt-8 text-center">
            <button 
              type="button" 
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                form.reset();
              }}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
            >
              {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </motion.div>
          
          <p className="mt-8 text-center text-xs text-slate-600 font-medium">
            Protected by advanced threat detection.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
