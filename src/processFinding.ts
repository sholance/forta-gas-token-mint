import fs from 'fs';
import { Finding } from 'forta-agent';

class Logger {
  private logFilePath: string;

  constructor(logFilePath: string) {
    this.logFilePath = logFilePath;
  }

  public logFinding(finding: Finding, batchNumber: number) {
    const timestamp = new Date().toISOString();
    const logEntry = `Timestamp: ${timestamp}\nBatch: ${batchNumber}\nName: ${finding.name}\nDescription: ${finding.description}\nMetadata: ${JSON.stringify(finding.metadata)}\nLabels: ${JSON.stringify(finding.labels)}\n\n`;
    fs.appendFileSync(this.logFilePath, logEntry, 'utf-8');
  }
}

export function processFindings(findings: Finding[]) {
  const logFilePath = 'log.txt';
  const logger = new Logger(logFilePath);
  const batchNumber = Math.floor(Date.now() / 1000); // Generate batch number based on current timestamp

//   console.log(`Processing ${findings.length} findings in batch ${batchNumber}`);

  for (const finding of findings) {
    logger.logFinding(finding, batchNumber);
    // console.log(`Finding: ${finding.name}`);
    // console.log(`Description: ${finding.description}`);
    // console.log('---');
  }
}
