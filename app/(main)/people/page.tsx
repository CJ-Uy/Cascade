import { getOrganizationPeople } from "./actions";
import { PeopleClient } from "./(components)/PeopleClient";

export default async function PeoplePage() {
  const people = await getOrganizationPeople();

  return (
    <div className="space-y-6">
      <PeopleClient people={people} />
    </div>
  );
}
