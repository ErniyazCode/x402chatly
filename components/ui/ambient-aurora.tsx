'use client';
import React, { useRef, useEffect } from 'react';

const AuroraCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let time = 0;
        let animationFrameId: number;

        const setCanvasSize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        const colors = [
            { r: 45, g: 212, b: 191 }, // Teal
            { r: 168, g: 85, b: 247 }, // Purple
            { r: 59, g: 130, b: 246 }, // Blue
            { r: 236, g: 72, b: 153 }  // Pink
        ];

        class Orb {
            x: number;
            y: number;
            radius: number;
            color: { r: number; g: number; b: number };
            vx: number;
            vy: number;
            canvasWidth: number;
            canvasHeight: number;

            constructor(canvasWidth: number, canvasHeight: number) {
                this.canvasWidth = canvasWidth;
                this.canvasHeight = canvasHeight;
                this.x = Math.random() * canvasWidth;
                this.y = Math.random() * canvasHeight;
                this.radius = Math.random() * 400 + 100;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
            }

            draw() {
                if (!ctx) return;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.3)`);
                gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            update() {
                this.x += this.vx + Math.sin(time * 0.001) * 0.5;
                this.y += this.vy + Math.cos(time * 0.001) * 0.5;

                if (this.x < -this.radius || this.x > this.canvasWidth + this.radius || 
                    this.y < -this.radius || this.y > this.canvasHeight + this.radius) {
                    this.x = Math.random() * this.canvasWidth;
                    this.y = Math.random() * this.canvasHeight;
                }
            }
        }

        let orbs: Orb[] = [];
        for (let i = 0; i < 10; i++) {
            orbs.push(new Orb(canvas.width, canvas.height));
        }

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time++;

            orbs.forEach(orb => {
                orb.update();
                orb.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        }
        animate();

        return () => {
            window.removeEventListener('resize', setCanvasSize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"></canvas>;
};

export default AuroraCanvas;
