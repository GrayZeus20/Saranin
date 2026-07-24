<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiController extends Controller
{
    public function logView(Request $request): JsonResponse
    {
        return response()->json(['success' => true]);
    }
}
