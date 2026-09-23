// builds a --tune patch and matching solution file for trying a level variant
const G = require('../public/gen.js');
const P = (ctrl) => ({ pts: G.path(ctrl) });
const OPENING = { x0: -320, x1: 620, h: 0 };
module.exports = { P, OPENING };
