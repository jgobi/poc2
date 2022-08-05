# Projeto e Design de Circuitos Lógicos Atômicos de Silício usando Algoritmos Evolutivos

Este projeto tem como objetivo o desenvolvimento de um algoritmo evolutivo capaz de gerar circuitos lógicos funcionais que possam ser avaliados usando o SiQAD.


## Funcionamento do projeto 

### Configurar o circuitor a ser avaliado

1. Apagar a região que vc quer analisar
2. Usar o colorize.js para colorir a região desejada com o parametro area
    2.1. "node ./colorize.js *.sqd area"
3. Apagar e criar o pertubador 0 
    3.1. "node ./colorize.js *.sqd in 0"
4. Apagar e criar o pertubador 1 
    4.1. "node ./colorize.js *.sqd in 1"
5. Apagar e criar o output (2dbs)
    5.1 "node ./colorize.js *.sqd out 0"
6. Apagar e criar o output (2dbs)
    6.1 "node ./colorize.js *.sqd out 1"

### Executar o algoritmo evolutivo

.truth
0,0,0: 0
0,0,1: 0
....
1,1,1: 1

### Analisar o resultado
node go.js --prefix (nome) -n 30 -c (continuar de onde parou) -t .truth .sqd

### Log2Siqad

node log2siqad.js (arquivo log gerado pelo go.js)

### Ver os dados
index.html  
    -> Ver as miagens e estatísticas
    -> Ver o gráfico bonitinho

    

> :warning: Este arquivo ainda é um *Work in Progress*.
