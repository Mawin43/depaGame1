"use client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  // -------- State --------
  const [velocity, setVelocity] = useState(50);
  const [angle, setAngle] = useState(45);
  const [isShooting, setIsShooting] = useState(false);
  const [hitTarget, setHitTarget] = useState(false);
  const [level, setLevel] = useState(1);
  const [bestStage, setBestStage] = useState(1);
  const [remainingBall, setRemainingBall] = useState(5);
  const [over, setOver] = useState(false);
  const [oneShot, setOneShot] = useState(0);

  // ขนาดเป้า
  const [targetRadius, setTargetRadius] = useState(50);

  // ปุ่ม "ด่านต่อไป"
  const [showStartButton, setShowStartButton] = useState(false);

  // -------- Refs --------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestIdRef = useRef<number | null>(null);

  // โหลดรูป tower + enemy + cloud
  const towerImgRef = useRef<HTMLImageElement | null>(null);
  const enemyImgRef = useRef<HTMLImageElement | null>(null);
  const cloudImgRef = useRef<HTMLImageElement | null>(null);

  // เก็บเส้นที่ยิง
  const linesRef = useRef<
    Array<{
      velocity: number;
      angle: number;
      points: Array<{ x: number; y: number }>;
      finalX?: number;
      finalY?: number;
    }>
  >([]);

  // -------- ค่าคงที่ --------
  const g = 9.8;
  const groundY = 400;
  const playerX = 50;
  const playerY = groundY;
  const playerWidth = 80;
  const playerHeight = 110;
  const bulletRadius = 5;

  // ตำแหน่ง enemy
  const [targetX, setTargetX] = useState(600);
  const [targetY, setTargetY] = useState(350);

  // โหลดรูปใน useEffect
  useEffect(() => {
    const tImg = new Image();
    tImg.src = "/img/tower.png";
    tImg.onload = () => {
      towerImgRef.current = tImg;
      redrawAll();
    };

    const eImg = new Image();
    eImg.src = "/img/enemy.gif";
    eImg.onload = () => {
      enemyImgRef.current = eImg;
      redrawAll();
    };

    const bImg = new Image();
    bImg.src = "/img/cloud.jpg";
    bImg.onload = () => {
      cloudImgRef.current = bImg;
      redrawAll();
    };
  }, []);

  // ฟังก์ชันวาดลูกศร
  function drawArrow(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    angleDeg: number,
    length: number
  ) {
    const rad = (angleDeg * Math.PI) / 180;
    const endX = startX + length * Math.cos(rad);
    const endY = startY - length * Math.sin(rad);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.stroke();

    // หัวลูกศร
    const headLength = 10;
    const angleLeft = rad + (30 * Math.PI) / 180;
    const angleRight = rad - (30 * Math.PI) / 180;

    const leftX = endX - headLength * Math.cos(angleLeft);
    const leftY = endY + headLength * Math.sin(angleLeft);
    const rightX = endX - headLength * Math.cos(angleRight);
    const rightY = endY + headLength * Math.sin(angleRight);

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.lineTo(endX, endY);
    ctx.fillStyle = "blue";
    ctx.fill();

    // ข้อความ
    const label = `(ความเร็ว ${velocity}, มุม ${angleDeg})`;
    ctx.font = "14px Arial";
    const textWidth = ctx.measureText(label).width;
    const textHeight = 16;
    const padding = 4;
    const labelX = endX;
    const labelY = endY - 10;

    ctx.fillStyle = "black";
    ctx.fillRect(
      labelX - padding,
      labelY - textHeight - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );
    ctx.fillStyle = "white";
    ctx.fillText(label, labelX, labelY - padding);
  }

  // วาดฉาก
  const drawScene = (ctx: CanvasRenderingContext2D) => {
    // พื้นหลัง
    if (cloudImgRef.current) {
      ctx.drawImage(
        cloudImgRef.current,
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height
      );
    } else {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // พื้นสีเขียว
    ctx.fillStyle = "green";
    ctx.fillRect(0, groundY, ctx.canvas.width, ctx.canvas.height - groundY);

    // ป้อม
    if (towerImgRef.current) {
      ctx.drawImage(
        towerImgRef.current,
        playerX,
        playerY - playerHeight,
        playerWidth,
        playerHeight
      );
    } else {
      ctx.fillStyle = "purple";
      ctx.fillRect(playerX, playerY - playerHeight, playerWidth, playerHeight);
    }

    // enemy.gif
    if (enemyImgRef.current) {
      ctx.drawImage(
        enemyImgRef.current,
        targetX - targetRadius,
        targetY - targetRadius,
        targetRadius * 2,
        targetRadius * 2
      );
    } else {
      ctx.beginPath();
      ctx.arc(targetX, targetY, targetRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "blue";
      ctx.fill();
    }
  };

  // วาดเส้น
  const drawAllLines = (ctx: CanvasRenderingContext2D) => {
    linesRef.current.forEach((line) => {
      const pts = line.points;
      if (pts.length === 0) return;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (line.finalX !== undefined && line.finalY !== undefined) {
        const text = `ความเร็ว ${line.velocity}, มุม ${line.angle})`;
        ctx.font = "14px Arial";
        const textWidth = ctx.measureText(text).width;
        const textHeight = 16;
        const padding = 4;
        const labelX = line.finalX;
        const labelY = line.finalY - 10;

        ctx.fillStyle = "black";
        ctx.fillRect(
          labelX - padding,
          labelY - textHeight - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        );
        ctx.fillStyle = "white";
        ctx.fillText(text, labelX, labelY - padding);
      }
    });
  };

  // redrawAll
  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawScene(ctx);
    drawAllLines(ctx);

    if (!isShooting && !hitTarget && !showStartButton) {
      const muzzleX = playerX + playerWidth / 2;
      const muzzleY = playerY - playerHeight;
      drawArrow(ctx, muzzleX, muzzleY, angle, 60);
    }
  };

  // ตรวจชน
  const checkCollision = (bulletX: number, bulletY: number) => {
    const dx = bulletX - targetX;
    const dy = bulletY - targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < targetRadius + bulletRadius;
  };

  // ยิง
  const handleShoot = () => {
    setOneShot(oneShot + 1);
    setIsShooting(true);
    setHitTarget(false);
    setRemainingBall(remainingBall - 1);

    linesRef.current.push({
      velocity,
      angle,
      points: [],
    });
  };

  // รีเซ็ต
  const handleReset = () => {
    if (level > bestStage) {
      setBestStage(level);
    }
    setIsShooting(false);
    if (requestIdRef.current !== null) {
      cancelAnimationFrame(requestIdRef.current);
    }
    setHitTarget(false);

    linesRef.current = [];
    redrawAll();

    setShowStartButton(false);
    setOver(false);
    setRemainingBall(5);
    setOneShot(0);
    setLevel(1);

    setTargetRadius(50);
  };

  const handleNext = () => {
    setIsShooting(false);
    if (requestIdRef.current !== null) {
      cancelAnimationFrame(requestIdRef.current);
    }
    setHitTarget(false);

    linesRef.current = [];
    redrawAll();
    setShowStartButton(false);
    setOver(false);

    if (oneShot === 1) {
      setRemainingBall(remainingBall + 2);
    } else {
      setRemainingBall(remainingBall + 1);
    }
    setOneShot(0);
  };

  // ด่านต่อไป
  const handleNextLevel = () => {
    if (requestIdRef.current !== null) {
      cancelAnimationFrame(requestIdRef.current);
    }
    setLevel((prev) => {
      const newLevel = prev + 1;
      if (newLevel % 3 === 0) {
        setTargetRadius((oldRad) => Math.max(5, oldRad - 2));
      }
      return newLevel;
    });

    // สุ่มตำแหน่ง enemy
    const randomX = Math.floor(Math.random() * (750 - 400 + 1)) + 400;
    const randomY = Math.floor(Math.random() * (350 - 50 + 1)) + 50;
    setTargetX(randomX);
    setTargetY(randomY);

    setHitTarget(false);
    setIsShooting(false);

    linesRef.current = [];
    redrawAll();
    setShowStartButton(true);
  };

  // อนิเมชันลูกกระสุน
  const animateProjectile = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startTime = Date.now();

    const drawFrame = () => {
      const rad = (angle * Math.PI) / 180;
      const speedFactor = 7; // เร่งความเร็ว
      const t = (Date.now() - startTime) / 1000;
      const scaledTime = t * speedFactor;

      const x = velocity * Math.cos(rad) * scaledTime;
      const y =
        velocity * Math.sin(rad) * scaledTime -
        0.5 * g * scaledTime * scaledTime;

      drawScene(ctx);
      drawAllLines(ctx);

      const bulletStartX = playerX + playerWidth / 2;
      const bulletStartY = playerY - playerHeight;
      const bulletX = bulletStartX + x;
      const bulletY = bulletStartY - y;

      if (bulletY <= groundY) {
        const currentShotIndex = linesRef.current.length - 1;
        linesRef.current[currentShotIndex].points.push({
          x: bulletX,
          y: bulletY,
        });

        ctx.beginPath();
        ctx.arc(bulletX, bulletY, bulletRadius, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();

        if (bulletX < 0 || bulletX > canvas.width || bulletY < 0) {
          setIsShooting(false);
          if (remainingBall <= 0) {
            setOver(true);
          }
          linesRef.current[currentShotIndex].finalX = bulletX;
          linesRef.current[currentShotIndex].finalY = bulletY;
          redrawAll();
          return;
        }
        // ตรวจชน
        if (!hitTarget) {
          const isHit = checkCollision(bulletX, bulletY);
          if (isHit) {
            setHitTarget(true);
            setIsShooting(false);

            linesRef.current[currentShotIndex].finalX = bulletX;
            linesRef.current[currentShotIndex].finalY = bulletY;
            redrawAll();
            handleNextLevel();
            return;
          }
        }
      } else {
        // ตกพื้น
        if (remainingBall <= 0) {
          setOver(true);
        }
        setIsShooting(false);
        const currentShotIndex = linesRef.current.length - 1;
        linesRef.current[currentShotIndex].finalX = bulletX;
        linesRef.current[currentShotIndex].finalY = bulletY;
        redrawAll();
        return;
      }

      requestIdRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
  };

  // useEffect: isShooting => animate
  useEffect(() => {
    if (isShooting) {
      animateProjectile();
    } else {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current);
      }
    }
    return () => {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current);
      }
    };
  }, [isShooting]);

  // useEffect: mount => วาดฉากครั้งแรก
  useEffect(() => {
    redrawAll();
  }, []);

  // useEffect: angle, velocity เปลี่ยน => วาดใหม่
  useEffect(() => {
    if (!isShooting && !hitTarget && !showStartButton) {
      redrawAll();
    }
  }, [angle, velocity, isShooting, hitTarget, showStartButton]);

  return (
    <div
      style={{
        backgroundColor: "black", // พื้นหลังสีดำ
        color: "white",
        minHeight: "100vh",
        textAlign: "center",
        position: "relative",
        marginTop: 0,
        paddingTop: 50,
      }}
    >
      <div
        style={{
          gap: "20px",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
          width: "fit-content",
          height: "150px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "30px",
            fontWeight: "bold",
            color: "#FFFFFF",
            marginRight: "10px",
          }}
        >
          Projectile Game Stage {level} (Highest Stage {bestStage})
        </h1>
        <br />
        <h1
          style={{
            fontSize: "25px",
            fontWeight: "bold",
            color: "#21ff6e",
            marginRight: "10px",
          }}
        >
          เหลือบอล {remainingBall} ลูก
        </h1>
        <br />
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        style={{
          border: "1px solid black",
          display: "block",
          margin: "20px auto",
        }}
      />

      {/* ถ้ายิงโดน => ด่านต่อไป */}
      {showStartButton && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "30px",
            background:
              "linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.8))",
            borderRadius: "15px",
            boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.5)",
            textAlign: "center",
            color: "white",
            width: "300px",
          }}
        >
          <p style={{ color: "red", fontSize: "20px", fontWeight: "bold" }}>
            !! ยิงโดนแล้ว !!
          </p>
          <p style={{ color: "white", fontSize: "18px", marginTop: "10px" }}>
            !! ไปด่านต่อไปกันเถอะ !!
          </p>
          <br />
          <button
            onClick={handleNext}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(to right, #2196F3, #21CBF3)",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.3)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = "scale(1.1)";
              target.style.boxShadow = "0px 8px 15px rgba(0, 0, 0, 0.5)";
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = "scale(1)";
              target.style.boxShadow = "0px 5px 10px rgba(0, 0, 0, 0.3)";
            }}
          >
            ด่านต่อไป
          </button>
        </div>
      )}

      {/* บอลหมด => จบเกม */}
      {over && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "30px",
            background:
              "linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.8))",
            borderRadius: "15px",
            boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.5)",
            textAlign: "center",
            color: "white",
            width: "300px",
          }}
        >
          <p style={{ color: "red", fontSize: "20px", fontWeight: "bold" }}>
            !! บอลหมดแล้ว !!
          </p>
          <p
            style={{ color: "lightgreen", fontSize: "18px", marginTop: "10px" }}
          >
            มาได้ถึงด่านที่ {level}
          </p>
          <br />
          <button
            onClick={handleReset}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(to right, #4CAF50, #8BC34A)",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.3)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = "scale(1.1)";
              target.style.boxShadow = "0px 8px 15px rgba(0, 0, 0, 0.5)";
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = "scale(1)";
              target.style.boxShadow = "0px 5px 10px rgba(0, 0, 0, 0.3)";
            }}
          >
            เริ่มเล่นใหม่
          </button>
        </div>
      )}

      {/* ส่วนควบคุม input และปุ่มยิง */}
      <div
        style={{
          gap: "20px",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
          width: "fit-content",
          height: "auto",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          margin: "20px auto",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "20px",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
            width: "fit-content",
            height: "auto",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            marginBottom: "20px",
          }}
        >
          <label style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#FFFFFF",
                marginRight: "10px",
              }}
            >
              ความเร็ว (0-100):
            </span>
            <input
              type="number"
              value={velocity}
              min={0}
              max={110}
              onChange={(e) => {
                let v = Number(e.target.value);
                v = Math.max(0, Math.min(100, v));
                setVelocity(v);
              }}
              style={{
                padding: "10px",
                width: "80px",
                border: "2px solid #ccc",
                borderRadius: "5px",
                fontSize: "18px",
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor: "#f0f8ff",
                color: "#000000",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
              onBlur={(e) => (e.target.style.borderColor = "#ccc")}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#FFFFFF",
                marginRight: "10px",
              }}
            >
              มุม (0-90):
            </span>
            <input
              type="number"
              value={angle}
              min={0}
              max={90}
              onChange={(e) => {
                let a = Number(e.target.value);
                a = Math.max(0, Math.min(90, a));
                setAngle(a);
              }}
              style={{
                padding: "10px",
                width: "80px",
                border: "2px solid #ccc",
                borderRadius: "5px",
                fontSize: "18px",
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor: "#f0f8ff",
                color: "#000000",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
              onBlur={(e) => (e.target.style.borderColor = "#ccc")}
            />
          </label>
        </div>

        {!isShooting && !hitTarget && !showStartButton && (
          <button
            onClick={handleShoot}
            style={{
              marginRight: 20,
              width: 150,
              height: 60,
              background: "linear-gradient(to bottom, #ff5555, #ffe000)",
              color: "black",
              fontWeight: "bold",
              fontSize: "20px",
              border: "none",
              borderRadius: "8px",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = "scale(1.1)";
              target.style.boxShadow = "0px 6px 8px rgba(0, 0, 0, 0.15)";
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = "scale(1)";
              target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            !! SHOOT !!
          </button>
        )}
      </div>

      {/* ====== กรอบกติกา ด้านขวา ====== */}
      <div
        style={{
          position: "absolute",
          top: "200px", // ปรับตามความเหมาะสม
          right: "20px",
          width: "400px",
          padding: "15px",
          backgroundColor: "rgba(0,0,0,0.5)",
          border: "2px solid #fff",
          borderRadius: "10px",
          color: "#fff",
          textAlign: "left",
          marginTop: 30,
          marginRight: 30,
        }}
      >
        <h2 style={{ marginTop: 0 }}>กติกา</h2>
        <ul style={{ marginTop: 0 }}>
          <li>1. กำหนด "ความเร็ว" และ "มุม" สำหรับยิงลูกบอล</li>
          <li>2. กดปุ่ม “SHOOT” เพื่อยิงลูกบอล</li>
          <li>
            3. หากยิงลูกบอลโดนเป้าหมายตั้งแต่ครั้งแรก จะได้รับบอลคืน 2 ลูก
          </li>
          <li>
            4. หากยิงลูกบอลโดนเป้าหมายแต่ไม่ใช่ครั้งแรก จะได้รับบอลคืน 1 ลูก
          </li>
          <li>5. เป้าหมายจะตัวเล็กลงทุกๆ 3 ด่าน</li>
          <li>6. ถ้าบอลหมด ⇒ Game Over</li>
        </ul>
      </div>
    </div>
  );
}
