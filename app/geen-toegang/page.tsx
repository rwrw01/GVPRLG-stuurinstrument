export default function GeenToegangPage() {
  return (
    <div className="card">
      <h2>Geen toegang</h2>
      <p>
        Je hebt (nog) geen toegang tot Spinnenweb, of het inloggen is niet gelukt. Neem contact op met
        de beheerder van de gebruikersvereniging om toegang aan te vragen.
      </p>
      {/* Plain anchor: the logout route answers with a redirect to Keycloak, not a page. */}
      <a className="btn btn-outline" href="/api/auth/uitloggen">
        Uitloggen
      </a>
    </div>
  );
}
