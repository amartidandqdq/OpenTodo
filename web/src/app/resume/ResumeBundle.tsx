// One lazy chunk for the dossier screens (OpenSpec change resume-dossiers, design
// D7): Pick up the thread and one dossier, loaded by the shell together. The
// Waiting section lives in WaitingDossiers.tsx and is imported by the Waiting
// view directly, because that view already loads with the method views and must
// not pull these two screens in. DossierCard.tsx is the shared card My day and
// Waiting import without the screens.
export { ResumeView } from './ResumeView'
export { DossierView } from './DossierView'
