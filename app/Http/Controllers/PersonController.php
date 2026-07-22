<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;

class PersonController extends Controller
{
    public function __construct(protected TmdbService $tmdb) {}

    public function show(int $id)
    {
        $person = $this->tmdb->personDetail($id);

        if (isset($person['error'])) {
            abort(404);
        }

        return view('person.show', compact('person'));
    }
}
