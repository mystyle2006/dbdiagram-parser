import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

import {
  getColumnLine,
  getCreateTableLine,
  getForeignConstraintLine,
  isConstraint,
  isCreateTable,
  skipLine,
} from './utils/logics';

const END_OF_COLUMN_LINE = ',';
const END_OF_TABLE_LINE = ';';

async function parseToDBDiagram() {
  const fileStream = fs.createReadStream(path.join(__dirname, './from.txt'));
  const reader = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  const list = [];
  const constraintList = [];
  let temp = [];
  let constraintTableName = null;
  const constraintTemp = [];
  let startCreateTable = 0;
  let startConstraint = 0;

  for await (const line of reader) {
    if (skipLine(line)) {
      continue;
    }

    if (line.includes('constraint')) {
      constraintTemp.push(line);
      startConstraint = 1;
      continue;
    }

    if (startConstraint && isConstraint(line)) {
      if (line.includes('foreign key')) {
        constraintList.push(getForeignConstraintLine([...constraintTemp, line].join(' '), constraintTableName));
      }
      startConstraint = 0;
      continue;
    }

    if (isCreateTable(line)) {
      const { result, tableName } = getCreateTableLine(line);
      list.push(result);
      constraintTableName = tableName;
      startCreateTable = 1;
      continue;
    }

    if (!startCreateTable) {
      continue;
    }

    // 컬럼 하나의 라인이 2줄로 구성될 때 (내용이 길어서)
    if (!line.endsWith(END_OF_COLUMN_LINE)) {
      temp.push(line);
    }

    if (line.endsWith(END_OF_COLUMN_LINE)) {
      list.push(`\t ${getColumnLine([...temp, line].join(END_OF_COLUMN_LINE))}`);
      temp = [];
    }

    if (line.includes(END_OF_TABLE_LINE)) {
      list.push('} \n');
      startCreateTable = 0;
      constraintTableName = null;
      temp = [];
    }
  }

  list.push('\n');

  constraintList.forEach((line) => {
    list.push(line + '\n');
  });

  fs.writeFileSync(path.join(__dirname, 'to.txt'), list.join(''));
}

parseToDBDiagram();

