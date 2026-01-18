import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const qcmDir = path.join(process.cwd(), 'public', 'data', 'qcm');
    const indexPath = path.join(qcmDir, 'index.json');

    // Lire l'index actuel
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

    let updated = 0;
    const updates: any[] = [];

    // Parcourir chaque entrée
    for (const entry of indexData) {
      const filename = `${entry.slug}_${entry.annee}.json`;
      const filepath = path.join(qcmDir, filename);

      try {
        const qcmData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        const realTotal = qcmData.questions.length;

        if (entry.total_questions !== realTotal) {
          updates.push({
            matiere: entry.matiere,
            annee: entry.annee,
            old: entry.total_questions,
            new: realTotal
          });
          entry.total_questions = realTotal;
          updated++;
        }
      } catch (error: any) {
        console.error(`Erreur avec ${filename}:`, error.message);
      }
    }

    // Sauvegarder l'index mis à jour
    if (updated > 0) {
      fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    }

    return NextResponse.json({
      success: true,
      updated,
      changes: updates,
      message: updated > 0 
        ? `${updated} entrée(s) mise(s) à jour`
        : 'Tous les totaux sont déjà corrects'
    });
  } catch (error: any) {
    console.error('Erreur sync:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
