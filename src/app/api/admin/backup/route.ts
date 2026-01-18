import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const date = new Date().toLocaleString('fr-FR');
    
    const commands = [
      `cd ${process.cwd()}`,
      'git add public/data/qcm/*.json',
      `git commit -m "🔒 Backup manuel - ${date}"`,
      'git push origin main'
    ].join(' && ');

    const { stdout, stderr } = await execAsync(commands);

    return NextResponse.json({
      success: true,
      message: 'Backup effectué sur GitHub',
      timestamp,
      details: stdout
    });
  } catch (error: any) {
    // Si pas de changements à commit, c'est ok
    if (error.message.includes('nothing to commit')) {
      return NextResponse.json({
        success: true,
        message: 'Aucune modification à sauvegarder',
      });
    }

    console.error('Erreur backup:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erreur lors du backup: ' + error.message 
      },
      { status: 500 }
    );
  }
}
