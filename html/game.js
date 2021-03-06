const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingQuality = "high";

let socket
if (window.location.hostname == "localhost") {
  socket = new Socket()
} else {
  socket = new Socket({
    transport: "wss",
    hostname: "inagame.herokuapp.com"
  })
}

const images = {
  idle: document.getElementById("girl-idle"),
  blink: document.getElementById("girl-blink"),
  walk1: document.getElementById("girl-walk1"),
  walk2: document.getElementById("girl-walk2"),

  garnish_tree: document.getElementById("garnish-tree"),
  lollipop_tree: document.getElementById("lollipop-tree"),
  dumpling_tree: document.getElementById("dumpling-tree"),
  garnish: document.getElementById("garnish"),
  lollipop: document.getElementById("lollipop"),
  dumpling: document.getElementById("dumpling")
};

function avatar_draw(avatar) {
  ctx.save();
  ctx.translate(avatar.x, avatar.y);
  let img = images[avatar.img];
  ctx.scale(scalex, -1);
  ctx.drawImage(img, -avatar.width / 2, 0, Math.abs(avatar.width), -avatar.height);
  ctx.restore();
}

class Tree {
  x = 200;
  y = 0;
  width = 120;
  height = 220;
  scalex = 1;
  scaley = 1;

  image = images.dumpling_tree;

  constructor(x) {
    this.x = x;
    this.scalex = 1 + 0.2 * (Math.random() - 0.5);
    this.scaley = 1 + 0.2 * (Math.random() - 0.5);
    if (Math.random() < 0.5) {
      this.scalex = -1;
    }

    if (Math.random() < 0.3) {
      this.image = images.garnish_tree;
    } else if (Math.random() < 0.6) {
      this.image = images.lollipop_tree;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.save();
    //ctx.fillRect(0, 0, ghostgirl.width, ghostgirl.height)
    ctx.scale(this.scalex, -this.scaley);
    //if (Math.random() < 0.02) img = this.images.blink;
    ctx.drawImage(this.image, -this.width / 2, 10, this.width, -this.height);
    ctx.restore();
    ctx.restore();
  }
}

let trees = [];
for (let i = 0; i < 50; i++) {
  trees.push(new Tree(300 + i * 200 + Math.random() * 100));
}

let friends = [];

socket.socket.onmessage = function(e) {
  friends = JSON.parse(e.data)
}

let ghostgirl = {
  x: 100,
  y: 0,
  width: 80,
  height: 125,
  movex: 0,
  movey: 0,
  time: 0,
  sleep: 1,
  img: "idle",

  animate(dt) {
    this.time = this.time + dt;

    if (this.time > 17) {
      this.sleep = 1;
    }
    if (this.sleep && this.movex) {
      this.sleep = 0;
      this.time = 0;
    }

    // gravity:
    this.movey = this.movey - dt * 1000;

    this.x = this.x + dt * this.movex;
    this.y = this.y + dt * this.movey;

    // wrap:
    //if (this.y)

    // don't fall through the floor:
    if (this.y < 0) {
      this.y = 0;
      this.movey = this.movey * -0.25;
      // bounce if we are walking
      if (this.movex != 0) {
        this.movey = 150;
      }
    }
  },

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.save();
    //ctx.fillRect(0, 0, ghostgirl.width, ghostgirl.height)
    let scalex = 1;
    if (this.sleep || this.movey > 200) {
      this.img = "blink"
    } else if (this.movex != 0) {
      let which = (this.time % 0.5) < 0.25;
      if (which) {
        this.img = "walk1"
      } else {
        this.img = "walk2"
      }
    } else if ((this.time % 5) < 0.5) {
      this.img = "blink"
    } else {
      this.img = "idle"
    }
    if (this.movex < 0) {
      scalex = -1;
    }
    ctx.scale(scalex, -1);
    let hover = 3 * Math.sin(this.time * 3);
    if (this.sleep) {
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(
        images[this.img],
        hover + this.width / 4,
        this.height / 2,
        this.width,
        -this.height
      );
    } else {
      ctx.drawImage(images[this.img], -this.width / 2, hover, this.width, -this.height);
    }
    ctx.restore();
    ctx.restore();
  }
};

let t0 = 0
function animate(t) {
  let dt = (t-t0)*0.001; // secondsg
  let width = window.innerWidth,
    height = window.innerHeight;
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  // coordinate system:
  ctx.translate(width / 2 - ghostgirl.x, height * 0.75);
  ctx.scale(1, -1);

  // ctx.filter = `blur(1px)`;

  ghostgirl.animate(dt);

  for (let tree of trees) {
    tree.draw(ctx);
  }
  for (let avatar of friends) {
    ctx.save();
    ctx.translate(avatar.x, avatar.y);
    let img = images[avatar.img];
    ctx.scale(Math.sign(avatar.width), -1);
    ctx.drawImage(img, -avatar.width / 2, 0, Math.abs(avatar.width), -avatar.height);
    ctx.restore();
  }

  ghostgirl.draw(ctx);

  // send my state:
  socket.send({
    x: ghostgirl.x,
    y: ghostgirl.y,
    width: ghostgirl.width * (ghostgirl.movex < 0 ? -1 : 1),
    height: ghostgirl.height,
    img: ghostgirl.img
  })

  t0=t
  requestAnimationFrame(animate);
}

document.onkeydown = function (event) {
  if (event.key == "ArrowRight") {
    ghostgirl.movex = 200;
  } else if (event.key == "ArrowLeft") {
    ghostgirl.movex = -200;
  } else if (event.key == " ") {
    ghostgirl.time = 0;
    ghostgirl.sleep = 0;
    ghostgirl.movey = 500;
  }
};

document.onkeyup = function (event) {
  if (event.key == "ArrowRight") {
    ghostgirl.movex = 0;
  } else if (event.key == "ArrowLeft") {
    ghostgirl.movex = 0;
  }
};

animate(t0);

