export class Engine {

constructor(){

this.level='basic';
}

setDifficulty(level){

this.level=level;
}

async getMove(fen){

console.log(
'Engine preparada para:',
this.level,
fen
);

return null;
}
}